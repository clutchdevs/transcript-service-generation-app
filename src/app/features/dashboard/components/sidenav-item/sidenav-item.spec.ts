import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidenavItem } from './sidenav-item';

describe('SidenavItem', () => {
  let component: SidenavItem;
  let fixture: ComponentFixture<SidenavItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidenavItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidenavItem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
