import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { ReadingListService } from '../../../services/reading-list.service';
import { Book } from '../../../models/book.model';
import { BookStatus } from '../../../models/book-status.model';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';
import { ActiveFilter, FilterControlsComponent } from '../../filter-controls/filter-controls.component';

interface BookBar {
  book: Book;
  startDate: Date;
  endDate: Date;
  y: number;
}

interface ChartDimensions {
  width: number;
  height: number;
  chartWidth: number;
  chartHeight: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

@Component({
  selector: 'app-graph-view',
  templateUrl: './graph-view.component.html',
  styleUrls: ['./graph-view.component.css']
})
export class GraphViewComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;
  @ViewChild('filterControls', { static: false }) filterControls!: FilterControlsComponent;
  @Output() viewBook = new EventEmitter<Book>();
  
  books: Book[] = [];
  filteredBooks: Book[] = [];
  activeFilters: ActiveFilter[] = [];
  selectedYear: number | null = null;
  dateRangeStart: string | null = null;
  dateRangeEnd: string | null = null;
  private booksSubscription?: Subscription;
  private resizeListener?: () => void;
  private hasAutoAppliedYearFilter = false;
  
  private svg: any;
  private margin = { top: 20, right: 200, bottom: 60, left: 30 };
  private width = 0;
  private height = 0;
  private chartWidth = 0;
  private chartHeight = 0;

  constructor(private readingListService: ReadingListService) {}

  ngOnInit(): void {
    this.subscribeToBooks();
  }

  ngAfterViewInit(): void {
    this.initializeChart();
    this.setupResizeListener();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private subscribeToBooks(): void {
    this.booksSubscription = this.readingListService.books$.subscribe(books => {
      this.books = books;
      this.filterBooks();
      if (this.chartContainer) {
        this.renderChart();
      }
    });
  }

  private initializeChart(): void {
    setTimeout(() => {
      this.renderChart();
      this.attemptAutoApplyCurrentYearFilter();
    }, 0);
  }

  private setupResizeListener(): void {
    this.resizeListener = () => {
      if (this.filteredBooks.length > 0) {
        this.renderChart();
      }
    };
    window.addEventListener('resize', this.resizeListener);
  }

  private cleanup(): void {
    if (this.booksSubscription) {
      this.booksSubscription.unsubscribe();
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }
  
  private attemptAutoApplyCurrentYearFilter(): void {
    setTimeout(() => {
      if (!this.hasAutoAppliedYearFilter && this.books.length > 0 && this.filterControls) {
        this.applyCurrentYearFilter();
      }
    }, 100);
  }

  private applyCurrentYearFilter(): void {
    if (this.hasAutoAppliedYearFilter || !this.filterControls) {
      return;
    }
    
    const currentYear = new Date().getFullYear();
    
    if (this.hasAvailableYears()) {
      this.tryApplyYearFilter(currentYear);
    } else {
      this.retryApplyYearFilterAfterDelay(currentYear);
    }
  }

  private hasAvailableYears(): boolean {
    return this.filterControls?.availableYears && this.filterControls.availableYears.length > 0;
  }

  private tryApplyYearFilter(year: number): void {
    if (!this.filterControls?.availableYears?.includes(year)) {
      return;
    }
    
    if (this.canApplyFilter()) {
      this.filterControls.filterByYear(year);
      this.hasAutoAppliedYearFilter = true;
    }
  }

  private canApplyFilter(): boolean {
    return this.selectedYear === null && !this.dateRangeStart && !this.dateRangeEnd;
  }

  private retryApplyYearFilterAfterDelay(year: number): void {
    if (!this.hasBooksInYear(year)) {
      return;
    }
    
    setTimeout(() => {
      if (!this.hasAutoAppliedYearFilter && this.hasAvailableYears()) {
        this.tryApplyYearFilter(year);
      }
    }, 200);
  }

  private hasBooksInYear(year: number): boolean {
    return this.books.some(book => {
      const startDate = this.parseDate(book.readingStartDate);
      const endDate = this.parseDate(book.readingEndDate);
      return (startDate?.getFullYear() === year) || (endDate?.getFullYear() === year);
    });
  }

  onFiltersChanged(filters: ActiveFilter[]): void {
    this.activeFilters = filters;
    this.extractFilterValues(filters);
    this.filterBooks();
    this.renderChart();
  }

  private extractFilterValues(filters: ActiveFilter[]): void {
    this.extractYearFilter(filters);
    this.extractDateRangeFilter(filters);
  }

  private extractYearFilter(filters: ActiveFilter[]): void {
    const yearFilter = filters.find(f => f.type === 'year');
    this.selectedYear = yearFilter ? (yearFilter.value as number) : null;
  }

  private extractDateRangeFilter(filters: ActiveFilter[]): void {
    const dateRangeFilter = filters.find(f => f.type === 'dateRange');
    if (dateRangeFilter) {
      const [start, end] = (dateRangeFilter.value as string).split('|');
      this.dateRangeStart = start || null;
      this.dateRangeEnd = end || null;
    } else {
      this.dateRangeStart = null;
      this.dateRangeEnd = null;
    }
  }

  filterBooks(): void {
    let filtered = this.getBooksWithStartDates();
    filtered = this.applyDateFilters(filtered);
    filtered = this.sortBooksByStartDate(filtered);
    this.filteredBooks = filtered;
  }

  private getBooksWithStartDates(): Book[] {
    return this.books.filter(book => 
      book.readingStartDate !== undefined && book.readingStartDate !== null
    );
  }

  private applyDateFilters(books: Book[]): Book[] {
    if (this.hasDateRangeFilter()) {
      return this.filterByDateRange(books);
    } else if (this.selectedYear !== null) {
      return this.filterByYear(books);
    }
    return books;
  }

  private hasDateRangeFilter(): boolean {
    return !!(this.dateRangeStart || this.dateRangeEnd);
  }

  private filterByDateRange(books: Book[]): Book[] {
    const rangeStart = this.dateRangeStart ? new Date(this.dateRangeStart) : null;
    const rangeEnd = this.dateRangeEnd ? new Date(this.dateRangeEnd) : null;

    return books.filter(book => {
      const bookDateRange = this.getBookDateRange(book);
      if (!bookDateRange) return false;

      const { start, end } = bookDateRange;
      
      if (rangeStart && end < rangeStart) return false;
      if (rangeEnd && start > rangeEnd) return false;
      
      return true;
    });
  }

  private filterByYear(books: Book[]): Book[] {
    const yearStart = new Date(this.selectedYear!, 0, 1);
    const yearEnd = new Date(this.selectedYear!, 11, 31, 23, 59, 59, 999);

    return books.filter(book => {
      const bookDateRange = this.getBookDateRange(book);
      if (!bookDateRange) return false;

      const { start, end } = bookDateRange;
      return start <= yearEnd && end >= yearStart;
    });
  }

  private getBookDateRange(book: Book): DateRange | null {
    const startDate = this.parseDate(book.readingStartDate);
    if (!startDate) return null;

    let endDate = this.parseDate(book.readingEndDate);
    if (!endDate) {
      endDate = this.getDefaultEndDate(book, startDate);
    }

    return { start: startDate, end: endDate };
  }

  private getDefaultEndDate(book: Book, startDate: Date): Date {
    if (book.status === BookStatus.Reading) {
      return new Date();
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    return endDate;
  }

  private sortBooksByStartDate(books: Book[]): Book[] {
    return books.sort((a, b) => {
      const dateA = this.parseDate(a.readingStartDate);
      const dateB = this.parseDate(b.readingStartDate);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });
  }

  get hasYearFilter(): boolean {
    return this.selectedYear !== null || this.dateRangeStart !== null || this.dateRangeEnd !== null;
  }

  parseDate(date: string | Date | undefined): Date | null {
    if (!date) return null;
    if (date instanceof Date) return date;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  renderChart(): void {
    if (!this.canRenderChart()) {
      return;
    }

    this.clearPreviousChart();
    const dimensions = this.calculateDimensions();
    const svgGroup = this.createSVG(dimensions);
    const bookBars = this.prepareBookBars();
    
    if (bookBars.length === 0) {
      return;
    }

    const scales = this.createScales(bookBars, dimensions);
    this.drawAxes(svgGroup, scales, dimensions);
    this.drawBars(svgGroup, bookBars, scales);
    this.drawLabels(svgGroup, bookBars, scales);
    this.drawAxisLabel(svgGroup, dimensions);
  }

  private canRenderChart(): boolean {
    return !!(this.chartContainer && this.filteredBooks.length > 0);
  }

  private clearPreviousChart(): void {
    d3.select(this.chartContainer.nativeElement).selectAll('*').remove();
  }

  private calculateDimensions(): ChartDimensions {
    const container = this.chartContainer.nativeElement;
    const containerWidth = container.offsetWidth || 1200;
    
    this.width = Math.max(800, containerWidth);
    this.height = Math.max(400, this.filteredBooks.length * 20 + 100);
    this.chartWidth = this.width - this.margin.left - this.margin.right;
    this.chartHeight = this.height - this.margin.top - this.margin.bottom;

    return {
      width: this.width,
      height: this.height,
      chartWidth: this.chartWidth,
      chartHeight: this.chartHeight
    };
  }

  private createSVG(dimensions: ChartDimensions): any {
    this.svg = d3.select(this.chartContainer.nativeElement)
      .append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    return this.svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
  }

  private prepareBookBars(): BookBar[] {
    const bookBars: BookBar[] = [];

    this.filteredBooks.forEach((book, index) => {
      const bookDateRange = this.getBookDateRange(book);
      if (!bookDateRange) return;

      bookBars.push({
        book,
        startDate: bookDateRange.start,
        endDate: bookDateRange.end,
        y: index
      });
    });

    return bookBars;
  }

  private createScales(bookBars: BookBar[], dimensions: ChartDimensions): { xScale: any; yScale: any } {
    const dateDomain = this.calculateDateDomain(bookBars);
    const xScale = d3.scaleTime()
      .domain([dateDomain.start, dateDomain.end])
      .range([0, dimensions.chartWidth]);

    const yScale = d3.scaleBand()
      .domain(this.filteredBooks.map((_, i) => i.toString()))
      .range([0, dimensions.chartHeight])
      .padding(0.2);

    return { xScale, yScale };
  }

  private calculateDateDomain(bookBars: BookBar[]): DateRange {
    const dates = bookBars.flatMap(bar => [bar.startDate, bar.endDate]);
    const minDate = d3.min(dates) || new Date();
    const maxDate = d3.max(dates) || new Date();
    
    const dateRange = maxDate.getTime() - minDate.getTime();
    const padding = dateRange * 0.1;
    
    return {
      start: new Date(minDate.getTime() - padding),
      end: new Date(maxDate.getTime() + padding)
    };
  }

  private drawAxes(svgGroup: any, scales: { xScale: any; yScale: any }, dimensions: ChartDimensions): void {
    const xAxis = d3.axisBottom(scales.xScale)
      .ticks(d3.timeMonth.every(1) as any)
      .tickFormat(d3.timeFormat('%b %Y') as any);

    svgGroup.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${dimensions.chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');
  }

  private drawBars(svgGroup: any, bookBars: BookBar[], scales: { xScale: any; yScale: any }): void {
    const bars = svgGroup.selectAll('.book-bar')
      .data(bookBars)
      .enter()
      .append('rect')
      .attr('class', 'book-bar')
      .attr('x', (d: BookBar) => scales.xScale(d.startDate))
      .attr('y', (d: BookBar) => scales.yScale(d.y.toString()) || 0)
      .attr('width', (d: BookBar) => {
        const width = scales.xScale(d.endDate) - scales.xScale(d.startDate);
        return Math.max(width, 2);
      })
      .attr('height', Math.min(scales.yScale.bandwidth(), 10))
      .attr('fill', (d: BookBar) => this.getStatusColor(d.book.status))
      .attr('stroke', 'rgba(44, 24, 16, 0.2)')
      .attr('stroke-width', 1)
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .on('click', (event: MouseEvent, d: BookBar) => {
        event.stopPropagation();
        this.viewBook.emit(d.book);
      })
      .on('mouseover', (event: MouseEvent, d: BookBar) => {
        this.showTooltip(event, d);
        this.highlightBar(event);
      })
      .on('mouseout', (event: MouseEvent) => {
        this.hideTooltip();
        this.unhighlightBar(event);
      });
  }

  private drawLabels(svgGroup: any, bookBars: BookBar[], scales: { xScale: any; yScale: any }): void {
    svgGroup.selectAll('.bar-label')
      .data(bookBars)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', (d: BookBar) => scales.xScale(d.endDate) + 8)
      .attr('y', (d: BookBar) => {
        const yPos = scales.yScale(d.y.toString());
        const bandwidth = Math.min(scales.yScale.bandwidth(), 10);
        return yPos ? yPos + bandwidth / 2 : 0;
      })
      .attr('dy', '0.35em')
      .style('font-size', '0.85rem')
      .style('fill', 'var(--text-primary)')
      .style('font-weight', '500')
      .text((d: BookBar) => ` - ${d.book.title}`);
  }

  private drawAxisLabel(svgGroup: any, dimensions: ChartDimensions): void {
    svgGroup.append('text')
      .attr('class', 'axis-label')
      .attr('transform', `translate(${dimensions.chartWidth / 2}, ${dimensions.chartHeight + this.margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '0.9rem')
      .style('fill', 'var(--text-primary)')
      .text('Date');
  }
  
  private getStatusColor(status: BookStatus): string {
    const colorMap: Record<BookStatus, string> = {
      [BookStatus.Finished]: '#6b8e23',
      [BookStatus.Reading]: '#8b6f47',
      [BookStatus.OnHold]: '#b8945f',
      [BookStatus.Abandoned]: '#6c757d',
      [BookStatus.ToRead]: '#8b7355'
    };
    return colorMap[status] || '#8b7355';
  }

  private highlightBar(event: MouseEvent): void {
    d3.select(event.currentTarget as Element)
      .attr('opacity', 0.8)
      .attr('stroke-width', 2);
  }

  private unhighlightBar(event: MouseEvent): void {
    d3.select(event.currentTarget as Element)
      .attr('opacity', 1)
      .attr('stroke-width', 1);
  }

  private showTooltip(event: MouseEvent, bookBar: BookBar): void {
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'var(--card-bg)')
      .style('border', '1px solid var(--border-color)')
      .style('border-radius', '4px')
      .style('padding', '8px 12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)');

    const tooltipContent = this.buildTooltipContent(bookBar);
    tooltip.html(tooltipContent)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .transition()
      .duration(200)
      .style('opacity', 1);
  }

  private buildTooltipContent(bookBar: BookBar): string {
    const startDateStr = bookBar.startDate.toLocaleDateString();
    const endDateStr = bookBar.endDate.toLocaleDateString();
    const duration = Math.ceil((bookBar.endDate.getTime() - bookBar.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return `
      <strong>${bookBar.book.title}</strong><br>
      ${bookBar.book.author}<br>
      <small>${startDateStr} - ${endDateStr}</small><br>
      <small>${duration} day${duration !== 1 ? 's' : ''}</small>
    `;
  }

  private hideTooltip(): void {
    d3.selectAll('.chart-tooltip').remove();
  }
}
