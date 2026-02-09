import { Component, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';

export type ViewType = 'timeline' | 'table' | 'graph' | 'collections' | 'settings';

@Component({
  selector: 'app-view-toolbar',
  templateUrl: './view-toolbar.component.html',
  styleUrls: ['./view-toolbar.component.css']
})
export class ViewToolbarComponent implements OnChanges {
  @Input() currentView: ViewType = 'timeline';
  @Output() viewChange = new EventEmitter<ViewType>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentView'] && !changes['currentView'].firstChange) {
      // View changed from parent, component is already in sync
    }
  }

  views: { type: ViewType; label: string; icon: string }[] = [
    { type: 'timeline', label: 'Timeline', icon: '📅' },
    { type: 'table', label: 'Table', icon: '📊' },
    { type: 'graph', label: 'Graph', icon: '📈' },
    { type: 'collections', label: 'Collections', icon: '✅' },
    { type: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  selectView(viewType: ViewType): void {
    if (this.currentView !== viewType) {
      this.currentView = viewType;
      this.viewChange.emit(viewType);
    }
  }
}
