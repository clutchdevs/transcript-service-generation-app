import { render } from '@testing-library/angular';
import { App } from './app';

describe('AppComponent', () => {
  it('should render the router outlet', async () => {
    const { container } = await render(App);
    expect(container.querySelector('router-outlet')).toBeTruthy();
  });
});
