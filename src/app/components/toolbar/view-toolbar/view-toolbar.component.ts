import { Component, EventEmitter, Output } from '@angular/core';

export type ViewType = 'timeline' | 'table' | 'graph';

@Component({
  selector: 'app-view-toolbar',
  templateUrl: './view-toolbar.component.html',
  styleUrls: ['./view-toolbar.component.css']
})
export class ViewToolbarComponent {
  @Output() viewChange = new EventEmitter<ViewType>();

  currentView: ViewType = 'timeline';

  views: { type: ViewType; label: string; icon: string }[] = [
    { type: 'timeline', label: 'Timeline', icon: '📅' },
    { type: 'table', label: 'Table', icon: '📊' },
    { type: 'graph', label: 'Graph', icon: '📈' }
  ];

  selectView(viewType: ViewType): void {
    if (this.currentView !== viewType) {
      this.currentView = viewType;
      this.viewChange.emit(viewType);
    }
  }
}
