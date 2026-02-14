import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/app';

describe('App Component', () => {
    it('renders without crashing', () => {
        render(
            <MemoryRouter>
                <App />
            </MemoryRouter>,
        );
        // Basic check to see if the main container or a known element is present
        // Since we have a login route usually, check for login-related text or the app container
        // Adjust this expectation based on what default route / renders
        // For now, just ensuring render() doesn't throw is a good start.
        expect(document.body).toBeInTheDocument();
    });
});
