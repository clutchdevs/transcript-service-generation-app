import { Component, computed, inject } from '@angular/core';
import { Auth } from '../../../../core/services/auth/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile {
  private auth = inject(Auth);

  readonly user = computed(() => this.auth.user());
}
