import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidenavHeader } from './sidenav-header';

describe('SidenavHeader', () => {
  let component: SidenavHeader;
  let fixture: ComponentFixture<SidenavHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidenavHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidenavHeader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
