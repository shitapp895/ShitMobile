# Loading States Documentation

This document explains how to use the loading states functionality in our mobile application.

## Overview

The application provides a global loading state management system using the `LoadingContext` and `LoadingOverlay` components. This system allows you to:

- Show and hide loading indicators anywhere in the application
- Display custom loading messages
- Handle multiple concurrent loading states
- Automatically handle loading states when making API requests
- Wrap asynchronous operations with loading states

## Components and Hooks

### LoadingProvider

The `LoadingProvider` is the core component that manages the loading state. It should be placed high in your component tree to make loading state available throughout your application.

```jsx
// App.tsx
import { LoadingProvider } from './src/contexts/LoadingContext';

function App() {
  return (
    <LoadingProvider>
      {/* Your app components */}
    </LoadingProvider>
  );
}
```

### LoadingOverlay

The `LoadingOverlay` component displays a loading indicator when the global loading state is active. It should be placed in your component tree, typically at the end of your App component.

```jsx
// App.tsx
import LoadingOverlay from './src/components/common/LoadingOverlay';

function App() {
  return (
    <>
      {/* Your app components */}
      <LoadingOverlay />
    </>
  );
}
```

### useLoading Hook

The `useLoading` hook provides access to the loading context and its methods.

```jsx
import { useLoading } from '../contexts/LoadingContext';

function MyComponent() {
  const { 
    isLoading,        // Boolean indicating if loading is active
    loadingText,      // Current loading message (if any)
    showLoading,      // Function to show loading (returns a loading ID)
    hideLoading,      // Function to hide loading (accepts optional loading ID)
    withLoading       // Helper to wrap promises with loading
  } = useLoading();
  
  // Component logic
}
```

### useAPI Hook

The `useAPI` hook combines loading and error handling for API requests, providing a streamlined way to handle async operations.

```jsx
import { useAPI } from '../hooks/useAPI';

function MyComponent() {
  const { 
    data,           // Data returned from the last API call
    isLoading,      // Local loading state for this component
    error,          // Error object if the request failed
    executeRequest, // Function to execute an API call with loading
    setData,        // Function to manually update the data
    reset           // Function to reset the API state
  } = useAPI<MyDataType>(); // Optionally specify the data type
  
  // Component logic
}
```

## Usage Examples

### Basic Loading

To show a simple loading indicator:

```jsx
const { showLoading, hideLoading } = useLoading();

// Show loading with a custom message
// Returns an ID that can be used to hide specifically this loading instance
const loadingId = showLoading('Loading data...');

// Later, hide the loading indicator
hideLoading(loadingId);

// Or hide all loading indicators
hideLoading();
```

### Multiple Loading States

The loading system supports multiple concurrent loading states:

```jsx
const { showLoading, hideLoading } = useLoading();

// Show first loading state
const id1 = showLoading('First operation...');

// Show second loading state
const id2 = showLoading('Second operation...');

// Hide first loading state when complete
hideLoading(id1);

// Hide second loading state when complete
hideLoading(id2);
```

### With Async Operations

To wrap an async operation with loading state:

```jsx
const { withLoading } = useLoading();

const handleFetchData = async () => {
  try {
    const result = await withLoading(
      fetchDataFromAPI(),  // Your async operation
      'Fetching data...'   // Optional loading message
    );
    
    // Handle successful result
  } catch (error) {
    // Handle errors
  }
};
```

### With API Hook

For a complete API request with loading and error handling:

```jsx
const { executeRequest, data, error, isLoading } = useAPI();

const handleFetchData = async () => {
  const result = await executeRequest(
    () => api.fetchData(),      // API function to call
    'Loading data...',          // Loading message
    'Failed to fetch data',     // Error fallback message
    {
      showGlobalLoading: true,  // Show global loading indicator
      handleGlobalError: true,  // Use global error handling
      keepPreviousDataOnError: false // Whether to keep previous data on error
    }
  );
  
  if (result) {
    // Handle successful response
  }
};
```

## Advanced Features

### API State Management

The `useAPI` hook provides state management for API requests:

```jsx
const { 
  data,     // The API response data
  isLoading, // Whether a request is in progress
  error,    // Error object if the last request failed
  reset     // Reset the state (clear data, error, and loading)
} = useAPI<User>();

// Reset the API state
const handleReset = () => {
  reset();
};
```

### Canceling Loading States

You can cancel loading states by storing and using the loading ID:

```jsx
const [loadingId, setLoadingId] = useState(null);

const startLoading = () => {
  const id = showLoading('Loading...');
  setLoadingId(id);
  // Start your operation...
};

const cancelLoading = () => {
  if (loadingId) {
    hideLoading(loadingId);
    setLoadingId(null);
    // Cancel your operation...
  }
};
```

## Best Practices

1. Use the `LoadingProvider` at the top level of your application
2. Place the `LoadingOverlay` component at the end of your App component
3. For simple loading indicators, use `showLoading` and `hideLoading`
4. For async operations, prefer the `withLoading` helper
5. For API requests, use the `useAPI` hook which combines loading and error handling
6. Always include a descriptive loading message to improve user experience
7. Store loading IDs when you need to cancel a specific loading state
8. For component-specific loading states, use local state instead of the global loading context 