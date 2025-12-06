import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InputComponent } from '../../../../../../shared/components/ui/input/input';
import { SelectComponent, SelectOption } from '../../../../../../shared/components/ui/select/select';

@Component({
  selector: 'app-transcriptions-filters',
  standalone: true,
  imports: [InputComponent, SelectComponent],
  templateUrl: './transcriptions-filters.html',
  styleUrl: './transcriptions-filters.scss'
})
export class TranscriptionsFilters {
  @Input() searchTerm = '';
  @Input() statusFilter = 'all';
  @Input() languageFilter = 'all';
  @Input() statusOptions: SelectOption[] = [];
  @Input() languageOptions: SelectOption[] = [];

  @Output() searchChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<string | number>();
  @Output() languageFilterChange = new EventEmitter<string | number>();

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }

  onStatusFilterChange(value: string | number): void {
    this.statusFilterChange.emit(value);
  }

  onLanguageFilterChange(value: string | number): void {
    this.languageFilterChange.emit(value);
  }
}

