import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CsvImportExportComponent } from './components/settings-drawer/csv-import-export/csv-import-export.component';
import { BookDetailsComponent } from './components/book-details/book-details.component';
import { BookDetailsFormComponent } from './components/book-details/book-details-form/book-details-form.component';
import { BookItemComponent } from './components/views/timeline/book-item/book-item.component';
import { TimelineComponent } from './components/views/timeline/timeline.component';
import { TimelineHeaderComponent } from './components/views/timeline/timeline-header/timeline-header.component';
import { SettingsDrawerComponent } from './components/settings-drawer/settings-drawer.component';
import { ViewToolbarComponent } from './components/toolbar/view-toolbar/view-toolbar.component';
import { ActionToolbarComponent } from './components/toolbar/action-toolbar/action-toolbar.component';
import { TableViewComponent } from './components/views/table/table-view.component';
import { FilterControlsComponent } from './components/filter-controls/filter-controls.component';
import { GraphViewComponent } from './components/views/graph/graph-view.component';

@NgModule({
  declarations: [
    AppComponent,
    TimelineComponent,
    TimelineHeaderComponent,
    SettingsDrawerComponent,
    ViewToolbarComponent,
    ActionToolbarComponent,
    TableViewComponent,
    FilterControlsComponent,
    GraphViewComponent,
    CsvImportExportComponent,
    BookDetailsComponent,
    BookDetailsFormComponent,
    BookItemComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
