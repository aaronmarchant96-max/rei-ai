# Development Setup Guide - Debate Furnace

## 📦 Installed Plugins & Connectors

### **Core Functionality**

- `react-markdown` - Markdown rendering for REI.ai responses
- `remark-gfm` - GitHub Flavored Markdown support
- `rehype-highlight` - Syntax highlighting for code blocks
- `localforage` - Offline storage for message history
- `react-dropzone` - File upload for document ingestion

### **API & Data Handling**

- `axios` - HTTP client for API requests
- `lodash` - Utility library for data manipulation
- `date-fns` - Date formatting utilities
- `dotenv` - Environment variable management

### **Vercel Integration**

- `@vercel/analytics` - Vercel analytics
- `@vercel/speed-insights` - Performance monitoring

### **Development & Testing**

- `jest` - Testing framework
- `supertest` - HTTP assertions for API testing
- `@testing-library/react` - React testing utilities
- `@testing-library/jest-dom` - DOM testing utilities
- `@testing-library/user-event` - User event simulation
- `prettier` - Code formatting
- `eslint` - Code linting
- `babel-jest` - Babel integration for Jest
- `identity-obj-proxy` - CSS module mocking

## 🛠 Configuration Files Created

### 1. **ESLint Configuration** (`/.eslintrc.json`)

- React recommended rules
- React Hooks linting
- Custom formatting rules (2-space indent, double quotes, semicolons)
- Jest environment support

### 2. **Prettier Configuration** (`/.prettierrc`)

- 2-space indentation
- Double quotes
- Semicolons
- 100-character line width
- Consistent bracket spacing

### 3. **Jest Configuration** (`/jest.config.js`)

- JSDOM test environment
- React component testing setup
- CSS module mocking
- Babel transformation
- 80% code coverage threshold
- Next.js path aliases support

### 4. **Jest Setup** (`/jest.setup.js`)

- localStorage mocking
- matchMedia mocking for CSS tests
- Testing library DOM extensions

### 5. **Babel Configuration** (`/.babelrc`)

- Next.js Babel preset
- Ready for custom plugins

### 6. **Environment Example** (`/.env.example`)

- GROQ_API_KEY placeholder
- Hinge AI CLI path
- API configuration defaults
- Vercel analytics ID
- Development settings

## 🚀 Usage Guide

### **Code Formatting**

```bash
# Format all files
npm run format

# Check formatting
npm run lint

# Fix linting issues
npm run lint:fix
```

### **Testing**

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Test specific file
npm test src/REI.test.jsx
```

### **Environment Setup**

```bash
# Copy example env file
cp .env.example .env.local

# Add your Groq API key
echo "GROQ_API_KEY=your_key_here" >> .env.local
```

## 🎯 Integration with Existing Code

### **Markdown Rendering in REI.jsx**

```jsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// In your message rendering:
<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
  {message.text}
</ReactMarkdown>;
```

### **Local Storage for Message History**

```jsx
import localforage from "localforage";

// Save messages
const saveMessages = async (messages) => {
  await localforage.setItem("reiMessages", messages);
};

// Load messages
const loadMessages = async () => {
  return (await localforage.getItem("reiMessages")) || [];
};
```

### **File Upload with Dropzone**

```jsx
import { useDropzone } from "react-dropzone";

const { getRootProps, getInputProps } = useDropzone({
  accept: {
    "text/plain": [".txt"],
    "application/pdf": [".pdf"],
    "image/*": [".png", ".jpg", ".jpeg"],
  },
  maxFiles: 1,
  onDrop: (acceptedFiles) => {
    // Handle file upload to /api/cfai with ingest command
  },
});
```

### **API Requests with Axios**

```jsx
import axios from "axios";

const callHingeAI = async (prompt, domain) => {
  try {
    const response = await axios.post("/api/cfai", {
      prompt,
      domain,
      command: "score",
    });
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    return null;
  }
};
```

## 📋 Scripts Added to package.json

```json
{
  "scripts": {
    "format": "prettier --write .",
    "lint": "eslint . --ext .js,.jsx",
    "lint:fix": "eslint . --ext .js,.jsx --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## 🔧 Development Workflow

### **1. Before Committing**

```bash
# Format code
npm run format

# Check linting
npm run lint

# Run tests
npm test
```

### **2. Adding New Features**

```bash
# Create new component
 touch src/components/NewFeature.jsx

# Add test file
 touch src/components/NewFeature.test.jsx

# Implement feature
# Add tests
# Verify coverage
```

### **3. Debugging**

```bash
# Run specific test
npm test -- src/components/REI.test.jsx

# Run with verbose output
npm test -- --verbose

# Debug specific test
node --inspect-brk -r @babel/register node_modules/jest/bin/jest.js --runInBand src/components/REI.test.jsx
```

## 📊 Code Quality Standards

### **ESLint Rules**

- ✅ React best practices
- ✅ React Hooks rules
- ✅ 2-space indentation
- ✅ Double quotes
- ✅ Semicolons required
- ✅ No unused variables (warn)
- ✅ No console.log (warn)

### **Testing Standards**

- ✅ 80% minimum coverage
- ✅ Component tests
- ✅ Integration tests
- ✅ API endpoint tests
- ✅ Mock external dependencies

### **Formatting Standards**

- ✅ Consistent indentation
- ✅ Line length: 100 characters
- ✅ Bracket spacing
- ✅ Arrow function parentheses

## 🎯 Next Steps

### **Immediate Integration**

1. **Add markdown rendering** to REI.jsx messages
2. **Implement message history** with localforage
3. **Add file upload** for document ingestion
4. **Update API calls** to use axios
5. **Add Vercel analytics** to layout

### **Testing Setup**

1. **Create test files** for major components
2. **Add API endpoint tests**
3. **Implement integration tests**
4. **Set up CI/CD testing** in Vercel

The project is now fully configured with professional development tools and ready for the next phase of feature implementation!
