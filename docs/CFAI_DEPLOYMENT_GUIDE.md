# CFai/Hinge AI Deployment Guide for PromptHound Labs

This guide explains how to deploy the CFai (Hinge AI) tool to your existing PromptHound Labs Vercel site.

## 🎯 Deployment Architecture

The CFai tool is integrated into your existing **Debate Furnace** Vercel deployment using:

1. **Web Interface**: React components in `src/components/Cfai/`
2. **API Layer**: Node.js route handlers in `api/cfai/`
3. **CLI Backend**: Your existing CFai bash scripts called via child processes

## ✅ What's Already Set Up

### Files Created:

- `src/components/Cfai/CfaiInterface.jsx` - Main React component
- `src/components/Cfai/CfaiInterface.module.css` - Styling
- `api/cfai/route.js` - API endpoint handler
- Updated `AppShell.jsx` - Added CFai to the tool navigation
- Updated `vercel.json` - Added API route configuration

### Features:

- ✅ Web-based interface for all CFai commands
- ✅ Real-time API calls to your CFai CLI
- ✅ Command history and results display
- ✅ Error handling and loading states
- ✅ Responsive design
- ✅ CARDO REI methodology integration

## 🚀 Deployment Steps

### 1. Install Dependencies

```bash
cd debate-furnace
npm install
```

### 2. Configure Environment Variables

Create or update your Vercel project environment variables:

```bash
# Required for CFai to work
GROQ_API_KEY=your_groq_api_key_here

# Optional
CFAI_PATH=/home/potatoking/.local/bin/cfai
MODEL=groq/compound
MAX_TOKENS=2048
```

**How to set on Vercel:**

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the above variables

### 3. Test Locally

```bash
npm run dev
```

Then visit:

- `http://localhost:3000/#cfai` - Direct CFai interface
- `http://localhost:3000` - Full app with CFai in navigation

### 4. Deploy to Vercel

```bash
# Deploy your changes
vercel

# Or if already deployed
vercel --prod
```

### 5. Verify Deployment

Once deployed:

- Visit your Vercel URL with `/#cfai` hash
- Test all CFai commands through the web interface
- Check that API endpoints work: `https://your-site.vercel.app/api/cfai`

## 📡 API Endpoints

### GET `/api/cfai`

```
https://your-site.vercel.app/api/cfai?command=help
https://your-site.vercel.app/api/cfai?command=score&args=test,args
```

### POST `/api/cfai`

```json
{
  "command": "score",
  "args": ["additional", "arguments"],
  "input": "Your text to process"
}
```

**Response:**

```json
{
  "success": true,
  "result": "Command output",
  "command": "cfai score additional arguments",
  "timestamp": "2026-06-27T12:00:00.000Z"
}
```

## 🛠️ Available Commands

The web interface supports all CFai commands:

| Command    | Description                         | Example                                   |
| ---------- | ----------------------------------- | ----------------------------------------- |
| `score`    | Score evidence with CARDO REI tiers | `Marriage certificate: John & Mary, 1892` |
| `ingest`   | Ingest and transcribe documents     | `--file /path/to/doc.txt`                 |
| `search`   | Search with contextual grounding    | `--query "Smith family 1880s"`            |
| `discover` | Discover lineage gaps               | `--branch Smith`                          |
| `validate` | Validate CSV structure              | `--csv "col1,col2,col3"`                  |
| `sync`     | Sync genealogy data                 | (No args needed)                          |
| `help`     | Show help                           | (No args needed)                          |

## 🎨 Web Interface Features

### User Experience:

- **Command Selector**: Dropdown with all CFai commands
- **Smart Defaults**: Auto-populates inputs based on command
- **History Tracking**: Shows recent commands and results
- **Loading States**: Visual feedback during processing
- **Error Handling**: Clear error messages
- **Responsive Design**: Works on mobile and desktop

### CARDO REI Integration:

- Evidence scoring uses 🟢🔵🟠🟡 tier system
- Results maintain the methodology's standards
- Verification workflows are respected

## ⚙️ Configuration Options

### Custom CFai Path

If your CFai executable is in a different location:

```javascript
// In api/cfai/route.js
const CFAI_PATH = process.env.CFAI_PATH || "/path/to/your/cfai";
```

### Model Configuration

Set default models via environment variables:

```bash
MODEL=groq/compound
MAX_TOKENS=4096
TEMP=0.7
```

## 🔧 Troubleshooting

### Common Issues:

1. **CFai command not found**
   - Ensure `CFAI_PATH` is set correctly
   - Verify the CFai script is in your deployment environment

2. **Groq API errors**
   - Check `GROQ_API_KEY` is set
   - Verify the API key is valid

3. **Permission issues**
   - Ensure the CFai script has execute permissions
   - Check that required files (familyMemory.json, etc.) are accessible

### Debugging:

Add debug logging to the API route:

```javascript
// In api/cfai/route.js
console.log("CFai command:", fullCommand);
console.log("Environment:", process.env.GROQ_API_KEY ? "✓" : "✗");
```

## 📈 Performance Considerations

1. **Caching**: CFai has built-in caching for repeated requests
2. **Model Selection**: The tool automatically selects optimal models
3. **Error Handling**: Robust error handling prevents crashes
4. **Loading States**: Users get visual feedback during processing

## 🔄 Update Process

To update CFai after making changes:

1. Update your CFai scripts in `~/.local/bin/cfai`
2. Test locally with `npm run dev`
3. Deploy to Vercel: `vercel --prod`
4. Verify the new functionality works

## 🎓 Best Practices

1. **Start with score command**: Best for testing the integration
2. **Monitor usage**: Keep an eye on Groq API usage
3. **Cache appropriately**: Use environment variables to control caching
4. **Test thoroughly**: Verify all commands work before production deployment

## 📝 Release Notes

### v1.0.0 (2026-06-27)

- Initial integration of CFai/Hinge AI into Debate Furnace
- Web interface for all CFai commands
- API layer for remote execution
- Full CARDO REI methodology support
- Ready for Vercel deployment

## 🚨 Important Notes

1. **Security**: Never expose your API keys in client-side code
2. **Cost**: Groq API calls incur costs - monitor usage
3. **Rate Limits**: Be aware of Groq rate limits
4. **Data Privacy**: Ensure genealogy data is handled appropriately

## 🎉 Next Steps

Your CFai tool is now ready for web deployment! The integration provides:

- ✅ Full CFai functionality via web interface
- ✅ Seamless integration with existing PromptHound Labs
- ✅ CARDO REI methodology preservation
- ✅ Professional, user-friendly design
- ✅ Ready for production deployment

**Deploy now and start using Hinge AI through your browser!**

---

_For more information, refer to the main CFai documentation in `HINGEAI_REFACTOR_SUMMARY.md`_
