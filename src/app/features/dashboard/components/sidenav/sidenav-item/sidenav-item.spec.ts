import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SidenavItem, SidenavItemData } from './sidenav-item';

describe('SidenavItem', () => {
  let component: SidenavItem;
  let fixture: ComponentFixture<SidenavItem>;

  const mockItem: SidenavItemData = {
    id: 'test',
    label: 'Test Item',
    icon: 'M12 2L2 7l10 5 10-5-10-5z',
    route: '/test',
    disabled: false
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidenavItem],
      providers: [
        provideRouter([])
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidenavItem);
    component = fixture.componentInstance;
    component.item = mockItem;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
