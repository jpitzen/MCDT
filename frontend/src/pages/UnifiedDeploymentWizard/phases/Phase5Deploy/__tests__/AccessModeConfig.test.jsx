/**
 * AccessModeConfig — Component Tests
 *
 * Renders AccessModeConfig inside a WizardProvider and validates:
 *   - Internal/external radio toggle behaviour
 *   - Conditional rendering of domain, SSL fields
 *   - Dispatch calls with correct ActionTypes
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccessModeConfig from '../AccessModeConfig';

// ---------- Mock WizardContext ----------
// We provide a minimal WizardProvider mock so we can control state and spy on dispatch.
const mockDispatch = jest.fn();
let mockState = {};

jest.mock('../../../WizardContext', () => ({
  useWizard: () => ({ state: mockState, dispatch: mockDispatch }),
  ActionTypes: {
    SET_ACCESS_MODE: 'SET_ACCESS_MODE',
    SET_EXTERNAL_DOMAIN: 'SET_EXTERNAL_DOMAIN',
    SET_SSL_MODE: 'SET_SSL_MODE',
    SET_SSL_CERT_ARN: 'SET_SSL_CERT_ARN',
    SET_SSL_CERT_FILE: 'SET_SSL_CERT_FILE',
    SET_SSL_KEY_FILE: 'SET_SSL_KEY_FILE',
  },
}));

// ---------- Tests ----------
beforeEach(() => {
  jest.clearAllMocks();
  mockState = {
    accessMode: 'internal',
    externalDomain: '',
    sslMode: 'acm',
    sslCertArn: '',
  };
});

describe('AccessModeConfig', () => {
  it('should render both Internal Only and External Access radio options', () => {
    render(<AccessModeConfig />);

    expect(screen.getByText('Internal Only')).toBeInTheDocument();
    expect(screen.getByText('External Access')).toBeInTheDocument();
  });

  it('should default to internal mode', () => {
    render(<AccessModeConfig />);

    const radios = screen.getAllByRole('radio');
    const internalRadio = radios.find(r => r.value === 'internal');
    expect(internalRadio).toBeChecked();
  });

  it('should dispatch SET_ACCESS_MODE when toggling to external', () => {
    render(<AccessModeConfig />);

    const radios = screen.getAllByRole('radio');
    const externalRadio = radios.find(r => r.value === 'external');
    fireEvent.click(externalRadio);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_ACCESS_MODE',
      payload: 'external',
    });
  });

  it('should show port-forward hint for internal mode', () => {
    render(<AccessModeConfig />);

    expect(screen.getByText(/kubectl port-forward/)).toBeInTheDocument();
  });

  it('should show domain and SSL config when access mode is external', () => {
    mockState.accessMode = 'external';
    render(<AccessModeConfig />);

    // Domain field visible
    expect(screen.getByLabelText(/Domain Name/i)).toBeInTheDocument();

    // SSL section visible
    expect(screen.getByText(/SSL\/TLS Certificate/i)).toBeInTheDocument();
  });

  it('should NOT show domain field in internal mode', () => {
    mockState.accessMode = 'internal';
    render(<AccessModeConfig />);

    // MUI Collapse keeps elements in DOM but hides them;
    // check the domain input is not visible (hidden by Collapse height: 0)
    const domainInput = screen.queryByLabelText(/Domain Name/i);
    if (domainInput) {
      expect(domainInput.closest('.MuiCollapse-root')).toHaveStyle('height: 0px');
    }
  });

  it('should dispatch SET_EXTERNAL_DOMAIN when typing domain', () => {
    mockState.accessMode = 'external';
    render(<AccessModeConfig />);

    const input = screen.getByLabelText(/Domain Name/i);
    fireEvent.change(input, { target: { value: 'test.example.com' } });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_EXTERNAL_DOMAIN',
      payload: 'test.example.com',
    });
  });

  it('should show ACM ARN field when sslMode is acm and accessMode is external', () => {
    mockState.accessMode = 'external';
    mockState.sslMode = 'acm';
    render(<AccessModeConfig />);

    expect(screen.getByLabelText(/ACM Certificate ARN/i)).toBeInTheDocument();
  });

  it('should dispatch SET_SSL_CERT_ARN when entering ARN', () => {
    mockState.accessMode = 'external';
    mockState.sslMode = 'acm';
    render(<AccessModeConfig />);

    const arnInput = screen.getByLabelText(/ACM Certificate ARN/i);
    fireEvent.change(arnInput, {
      target: { value: 'arn:aws:acm:us-east-1:123:certificate/abc' },
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_SSL_CERT_ARN',
      payload: 'arn:aws:acm:us-east-1:123:certificate/abc',
    });
  });

  it('should show upload info alert when sslMode is upload', () => {
    mockState.accessMode = 'external';
    mockState.sslMode = 'upload';
    render(<AccessModeConfig />);

    expect(screen.getByText(/Certificate upload creates a Kubernetes TLS Secret/i)).toBeInTheDocument();
  });

  it('should dispatch SET_SSL_MODE when switching SSL radio', () => {
    mockState.accessMode = 'external';
    render(<AccessModeConfig />);

    const radios = screen.getAllByRole('radio');
    const uploadRadio = radios.find(r => r.value === 'upload');
    fireEvent.click(uploadRadio);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_SSL_MODE',
      payload: 'upload',
    });
  });
});
