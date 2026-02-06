import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ViewType } from '../view-toolbar/view-toolbar.component';

@Component({
  selector: 'app-action-toolbar',
  templateUrl: './action-toolbar.component.html',
  styleUrls: ['./action-toolbar.component.css']
})
export class ActionToolbarComponent {
  @Input() currentView: ViewType = 'timeline';
  @Output() addBook = new EventEmitter<void>();

  onAddBook(): void {
    this.addBook.emit();
  }
}
