import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../../shared/components/ui/button/button';
import { LANGUAGES, OPERATING_POINTS } from '../../../../core/integrations/speechmatics/constants';

@Component({
  selector: 'app-new-transcription',
  imports: [CommonModule, Button],
  templateUrl: './new-transcription.html',
  styleUrl: './new-transcription.scss'
})
export class NewTranscription {
  readonly languages = LANGUAGES;
  readonly operatingPoints = OPERATING_POINTS;
}
