import { render, screen } from '@testing-library/angular';
import { App } from './app';

describe('AppComponent', () => {
  it('should render the title', async () => {
    await render(App);

    const title = screen.getByRole('heading', {name:'Hello, transcript-service-generation-app'})
    expect(title).toBeTruthy();
  });
});
