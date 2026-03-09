/**
 * WizardContext — Reducer Tests
 *
 * Since wizardReducer is an internal function, we test it through the
 * WizardProvider + useWizard hook. A tiny helper component dispatches
 * actions and exposes state for assertions.
 */

import React from 'react';
import { render, act, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WizardProvider, useWizard, ActionTypes } from '../WizardContext';

// Mock api module that WizardProvider may import
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    deployments: { list: jest.fn().mockResolvedValue({ data: [] }) },
    drafts: { list: jest.fn().mockResolvedValue({ data: [] }) },
  },
}));

// ---------- Test Harness ----------
let testState;
let testDispatch;

function StateReader() {
  const { state, dispatch } = useWizard();
  testState = state;
  testDispatch = dispatch;

  return (
    <div>
      <span data-testid="accessMode">{state.accessMode}</span>
      <span data-testid="externalDomain">{state.externalDomain}</span>
      <span data-testid="sslMode">{state.sslMode}</span>
      <span data-testid="sslCertArn">{state.sslCertArn}</span>
      <span data-testid="isDirty">{String(state.isDirty)}</span>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <WizardProvider>
      <StateReader />
    </WizardProvider>,
  );
}

// ---------- Tests ----------
describe('WizardContext Reducer — Access Mode', () => {
  it('should initialise with accessMode = "internal"', () => {
    renderWithProvider();
    expect(screen.getByTestId('accessMode').textContent).toBe('internal');
  });

  it('should update accessMode via SET_ACCESS_MODE', () => {
    renderWithProvider();

    act(() => {
      testDispatch({ type: ActionTypes.SET_ACCESS_MODE, payload: 'external' });
    });

    expect(screen.getByTestId('accessMode').textContent).toBe('external');
  });

  it('should set isDirty=true after SET_ACCESS_MODE', () => {
    renderWithProvider();

    act(() => {
      testDispatch({ type: ActionTypes.SET_ACCESS_MODE, payload: 'external' });
    });

    expect(screen.getByTestId('isDirty').textContent).toBe('true');
  });

  it('should update externalDomain via SET_EXTERNAL_DOMAIN', () => {
    renderWithProvider();

    act(() => {
      testDispatch({ type: ActionTypes.SET_EXTERNAL_DOMAIN, payload: 'myapp.example.com' });
    });

    expect(screen.getByTestId('externalDomain').textContent).toBe('myapp.example.com');
  });

  it('should update sslMode via SET_SSL_MODE', () => {
    renderWithProvider();

    act(() => {
      testDispatch({ type: ActionTypes.SET_SSL_MODE, payload: 'upload' });
    });

    expect(screen.getByTestId('sslMode').textContent).toBe('upload');
  });

  it('should update sslCertArn via SET_SSL_CERT_ARN', () => {
    renderWithProvider();

    act(() => {
      testDispatch({
        type: ActionTypes.SET_SSL_CERT_ARN,
        payload: 'arn:aws:acm:us-east-1:123:certificate/xyz',
      });
    });

    expect(screen.getByTestId('sslCertArn').textContent).toBe(
      'arn:aws:acm:us-east-1:123:certificate/xyz',
    );
  });

  it('should reset state via RESET_STATE', () => {
    renderWithProvider();

    // First modify state
    act(() => {
      testDispatch({ type: ActionTypes.SET_ACCESS_MODE, payload: 'external' });
      testDispatch({ type: ActionTypes.SET_EXTERNAL_DOMAIN, payload: 'changed.com' });
    });

    // Then reset
    act(() => {
      testDispatch({ type: ActionTypes.RESET_STATE });
    });

    // Should be back to defaults
    expect(screen.getByTestId('accessMode').textContent).toBe('internal');
    expect(screen.getByTestId('externalDomain').textContent).toBe('');
  });
});

describe('WizardContext Reducer — General', () => {
  it('should have SET_MODE action in ActionTypes', () => {
    expect(ActionTypes.SET_MODE).toBeDefined();
  });

  it('should have SET_PHASE action in ActionTypes', () => {
    expect(ActionTypes.SET_PHASE).toBeDefined();
  });

  it('should update mode via SET_MODE', () => {
    renderWithProvider();

    act(() => {
      testDispatch({ type: ActionTypes.SET_MODE, payload: 'expert' });
    });

    expect(testState.mode).toBe('expert');
  });

  it('should preserve other state when dispatching access mode actions', () => {
    renderWithProvider();

    const modeBefore = testState.mode;

    act(() => {
      testDispatch({ type: ActionTypes.SET_ACCESS_MODE, payload: 'external' });
    });

    expect(testState.mode).toBe(modeBefore);
    expect(testState.accessMode).toBe('external');
  });
});
