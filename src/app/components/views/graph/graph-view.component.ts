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
    this.booksSubscription = this.readingListService.books$.subscribe(books => {
      this.books = books;
      
      this.filterBooks();
      if (this.chartContainer) {
        this.renderChart();
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.renderChart();
      
      // Auto-apply current year filter if filter controls are available and not already applied
      // Use a small delay to ensure filter controls have processed the books input
      setTimeout(() => {
        if (!this.hasAutoAppliedYearFilter && this.books.length > 0 && this.filterControls) {
          this.applyCurrentYearFilter();
        }
      }, 100);
    }, 0);
    
    // Re-render on window resize
    this.resizeListener = () => {
      if (this.filteredBooks.length > 0) {
        this.renderChart();
      }
    };
    window.addEventListener('resize', this.resizeListener);
  }
  
  private applyCurrentYearFilter(): void {
    if (this.hasAutoAppliedYearFilter || !this.filterControls) {
      return;
    }
    
    const currentYear = new Date().getFullYear();
    
    // Check if current year is in available years
    // The filter controls component extracts years in ngOnChanges, so we may need to wait
    if (this.filterControls.availableYears && this.filterControls.availableYears.length > 0) {
      if (this.filterControls.availableYears.includes(currentYear)) {
        // Only apply if no filter is currently active
        if (this.selectedYear === null && !this.dateRangeStart && !this.dateRangeEnd) {
          this.filterControls.filterByYear(currentYear);
          this.hasAutoAppliedYearFilter = true;
        }
      }
    } else {
      // If years haven't been extracted yet, check if current year exists in books and try again
      const hasCurrentYear = this.books.some(book => {
        const startDate = this.parseDate(book.readingStartDate);
        const endDate = this.parseDate(book.readingEndDate);
        if (startDate && startDate.getFullYear() === currentYear) return true;
        if (endDate && endDate.getFullYear() === currentYear) return true;
        return false;
      });
      
      if (hasCurrentYear) {
        // Try again after a short delay to allow filter controls to process
        setTimeout(() => {
          if (!this.hasAutoAppliedYearFilter && this.filterControls && this.filterControls.availableYears && this.filterControls.availableYears.includes(currentYear)) {
            if (this.selectedYear === null && !this.dateRangeStart && !this.dateRangeEnd) {
              this.filterControls.filterByYear(currentYear);
              this.hasAutoAppliedYearFilter = true;
            }
          }
        }, 200);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.booksSubscription) {
      this.booksSubscription.unsubscribe();
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  onFiltersChanged(filters: ActiveFilter[]): void {
    this.activeFilters = filters;
    const yearFilter = filters.find(f => f.type === 'year');
    this.selectedYear = yearFilter ? (yearFilter.value as number) : null;
    
    const dateRangeFilter = filters.find(f => f.type === 'dateRange');
    if (dateRangeFilter) {
      const [start, end] = (dateRangeFilter.value as string).split('|');
      this.dateRangeStart = start || null;
      this.dateRangeEnd = end || null;
    } else {
      this.dateRangeStart = null;
      this.dateRangeEnd = null;
    }
    
    this.filterBooks();
    this.renderChart();
  }

  filterBooks(): void {
    // Only show books that have a reading start date
    let filtered = this.books.filter(book => {
      return book.readingStartDate !== undefined && book.readingStartDate !== null;
    });
    
    // Apply date range filter if set (takes precedence over year filter)
    if (this.dateRangeStart || this.dateRangeEnd) {
      filtered = filtered.filter(book => {
        const startDate = this.parseDate(book.readingStartDate);
        if (!startDate) return false;
        
        let endDate = this.parseDate(book.readingEndDate);
        if (!endDate) {
          if (book.status === BookStatus.Reading) {
            endDate = new Date();
          } else {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
          }
        }
        
        const rangeStart = this.dateRangeStart ? new Date(this.dateRangeStart) : null;
        const rangeEnd = this.dateRangeEnd ? new Date(this.dateRangeEnd) : null;
        
        // If rangeStart is set, book must start on or after it
        if (rangeStart && endDate < rangeStart) {
          return false;
        }
        
        // If rangeEnd is set, book must end on or before it
        if (rangeEnd && startDate > rangeEnd) {
          return false;
        }
        
        return true;
      });
    } else if (this.selectedYear !== null) {
      // Apply year filter if no date range is set
      filtered = filtered.filter(book => {
        const startDate = this.parseDate(book.readingStartDate);
        if (!startDate) return false;
        
        let endDate = this.parseDate(book.readingEndDate);
        if (!endDate) {
          if (book.status === BookStatus.Reading) {
            endDate = new Date();
          } else {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
          }
        }
        
        // Check if book overlaps with the selected year
        const yearStart = new Date(this.selectedYear!, 0, 1);
        const yearEnd = new Date(this.selectedYear!, 11, 31, 23, 59, 59, 999);
        return startDate <= yearEnd && endDate >= yearStart;
      });
    }
    
    // Sort by start date, most recent first
    filtered.sort((a, b) => {
      const dateA = this.parseDate(a.readingStartDate);
      const dateB = this.parseDate(b.readingStartDate);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });
    
    this.filteredBooks = filtered;
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
    if (!this.chartContainer || this.filteredBooks.length === 0) {
      return;
    }

    // Clear previous chart
    d3.select(this.chartContainer.nativeElement).selectAll('*').remove();

    // Calculate dimensions
    const container = this.chartContainer.nativeElement;
    const containerWidth = container.offsetWidth || 1200;
    // Use minimum width of 800px for readability, but allow container to be smaller for scrolling
    this.width = Math.max(800, containerWidth);
    this.height = Math.max(400, this.filteredBooks.length * 20 + 100); // Reduced band height to 50% (was 40, now 20)
    this.chartWidth = this.width - this.margin.left - this.margin.right;
    this.chartHeight = this.height - this.margin.top - this.margin.bottom;

    // Create SVG
    this.svg = d3.select(this.chartContainer.nativeElement)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    const g = this.svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Prepare data
    const bookBars: BookBar[] = [];
    const dates: Date[] = [];

    this.filteredBooks.forEach((book, index) => {
      const startDate = this.parseDate(book.readingStartDate);
      if (!startDate) return;

      let endDate = this.parseDate(book.readingEndDate);
      if (!endDate) {
        // If no end date, use current date for active reading, or start date + 1 day for to-read
        if (book.status === BookStatus.Reading) {
          endDate = new Date();
        } else {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        }
      }

      dates.push(startDate, endDate);
      bookBars.push({
        book,
        startDate,
        endDate,
        y: index
      });
    });

    if (bookBars.length === 0) {
      return;
    }

    // Calculate date range
    const minDate = d3.min(dates) || new Date();
    const maxDate = d3.max(dates) || new Date();
    
    // Add some padding to the date range
    const dateRange = maxDate.getTime() - minDate.getTime();
    const padding = dateRange * 0.1;
    const domainStart = new Date(minDate.getTime() - padding);
    const domainEnd = new Date(maxDate.getTime() + padding);

    // Create scales
    const xScale = d3.scaleTime()
      .domain([domainStart, domainEnd])
      .range([0, this.chartWidth]);

    const yScale = d3.scaleBand()
      .domain(this.filteredBooks.map((_, i) => i.toString()))
      .range([0, this.chartHeight])
      .padding(0.2);

    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(d3.timeMonth.every(1) as any)
      .tickFormat(d3.timeFormat('%b %Y') as any);

    // Draw x-axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${this.chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    // Color function based on status
    const getStatusColor = (status: BookStatus): string => {
      switch (status) {
        case BookStatus.Finished:
          return '#6b8e23';
        case BookStatus.Reading:
          return '#8b6f47';
        case BookStatus.OnHold:
          return '#b8945f';
        case BookStatus.Abandoned:
          return '#6c757d';
        default:
          return '#8b7355';
      }
    };

    // Draw bars
    const bars = g.selectAll('.book-bar')
      .data(bookBars)
      .enter()
      .append('rect')
      .attr('class', 'book-bar')
      .attr('x', (d: BookBar) => xScale(d.startDate))
      .attr('y', (d: BookBar) => yScale(d.y.toString()) || 0)
      .attr('width', (d: BookBar) => {
        const width = xScale(d.endDate) - xScale(d.startDate);
        return Math.max(width, 2); // Minimum width of 2px
      })
      .attr('height', Math.min(yScale.bandwidth(), 10))
      .attr('fill', (d: BookBar) => getStatusColor(d.book.status))
      .attr('stroke', 'rgba(44, 24, 16, 0.2)')
      .attr('stroke-width', 1)
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .on('click', (event: MouseEvent, d: BookBar) => {
        event.stopPropagation();
        this.viewBook.emit(d.book);
      })
      .on('mouseover', function(event: MouseEvent, d: BookBar) {
        d3.select(event.currentTarget as Element)
          .attr('opacity', 0.8)
          .attr('stroke-width', 2);
        
        // Show tooltip
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

        const startDateStr = d.startDate.toLocaleDateString();
        const endDateStr = d.endDate.toLocaleDateString();
        const duration = Math.ceil((d.endDate.getTime() - d.startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        tooltip.html(`
          <strong>${d.book.title}</strong><br>
          ${d.book.author}<br>
          <small>${startDateStr} - ${endDateStr}</small><br>
          <small>${duration} day${duration !== 1 ? 's' : ''}</small>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .transition()
          .duration(200)
          .style('opacity', 1);
      })
      .on('mouseout', function(event: MouseEvent) {
        d3.select(event.currentTarget as Element)
          .attr('opacity', 1)
          .attr('stroke-width', 1);
        
        d3.selectAll('.chart-tooltip').remove();
      });

    // Add text labels at the end of each bar
    g.selectAll('.bar-label')
      .data(bookBars)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', (d: BookBar) => xScale(d.endDate) + 8) // 8px padding after bar end
      .attr('y', (d: BookBar) => {
        const yPos = yScale(d.y.toString());
        const bandwidth = Math.min(yScale.bandwidth(), 10);
        return yPos ? yPos + bandwidth / 2 : 0;
      })
      .attr('dy', '0.35em')
      .style('font-size', '0.85rem')
      .style('fill', 'var(--text-primary)')
      .style('font-weight', '500')
      .text((d: BookBar) => ` - ${d.book.title}`);

    // Add x-axis label
    g.append('text')
      .attr('class', 'axis-label')
      .attr('transform', `translate(${this.chartWidth / 2}, ${this.chartHeight + this.margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '0.9rem')
      .style('fill', 'var(--text-primary)')
      .text('Date');
  }
}
