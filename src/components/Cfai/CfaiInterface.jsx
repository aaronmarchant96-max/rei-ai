import React, { useState, useEffect } from 'react';
import styles from './CfaiInterface.module.css';

const CfaiInterface = () => {
  const [command, setCommand] = useState('score');
  const [input, setInput] = useState('');
  const [args, setArgs] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const availableCommands = [
    { value: 'score', label: '🏷️ Score Evidence' },
    { value: 'ingest', label: '📄 Ingest Document' },
    { value: 'search', label: '🔍 Search' },
    { value: 'discover', label: '🌳 Discover Branch' },
    { value: 'validate', label: '✅ Validate CSV' },
    { value: 'help', label: '❓ Help' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/cfai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          args: args.split(',').filter(a => a.trim()),
          input
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }
      
      setResult(data);
      setHistory([...history, { command, input, result: data.result, timestamp: new Date() }]);
      
    } catch (err) {
      setError(err.message);
      console.error('CFai API error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCommandChange = (e) => {
    const newCommand = e.target.value;
    setCommand(newCommand);
    
    // Set default input based on command
    const defaults = {
      'score': 'Marriage certificate: John Smith & Mary Jones, 1892',
      'ingest': '--file /path/to/document.txt',
      'search': '--query "Smith family in Texas 1880s"',
      'discover': '--branch Smith',
      'validate': '--csv "id,name,birth_date,birth_place,evidence_tier,notes"',
      'help': ''
    };
    
    setInput(defaults[newCommand] || '');
  };

  return (
    <div className={styles.cfaiContainer}>
      <h2 className={styles.title}>🦉 Hinge AI (CFai) Interface</h2>
      <p className={styles.subtitle}>CARDO REI Powered Genealogy Research Assistant</p>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="command">Command:</label>
          <select
            id="command"
            value={command}
            onChange={handleCommandChange}
            className={styles.select}
          >
            {availableCommands.map(cmd => (
              <option key={cmd.value} value={cmd.value}>{cmd.label}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="input">Input/Arguments:</label>
          <textarea
            id="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={styles.textarea}
            rows={4}
            placeholder="Enter your input or arguments"
            required
          />
        </div>
        
        {command === 'ingest' && (
          <div className={styles.formGroup}>
            <label htmlFor="args">Additional Args:</label>
            <input
              id="args"
              type="text"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              className={styles.input}
              placeholder="e.g., --history-file=/path/to/history.json"
            />
          </div>
        )}
        
        <button
          type="submit"
          className={styles.button}
          disabled={loading}
        >
          {loading ? '🤖 Processing...' : '⚡ Execute CFai'}
        </button>
      </form>
      
      {error && (
        <div className={styles.error}>
          ❌ Error: {error}
        </div>
      )}
      
      {result && (
        <div className={styles.resultContainer}>
          <h3>📊 Result</h3>
          <div className={styles.resultHeader}>
            <span>Command: <code>{result.command}</code></span>
            <span>Status: {result.success ? '✅ Success' : '❌ Failed'}</span>
            <span>Time: {new Date(result.timestamp).toLocaleTimeString()}</span>
          </div>
          
          <div className={styles.resultContent}>
            {result.success ? (
              <pre className={styles.success}>{result.result}</pre>
            ) : (
              <pre className={styles.error}>{result.error}</pre>
            )}
          </div>
        </div>
      )}
      
      {history.length > 0 && (
        <div className={styles.history}>
          <h3>🕰️ Recent History ({history.length})</h3>
          <ul>
            {history.slice().reverse().slice(0, 5).map((item, index) => (
              <li key={index} className={styles.historyItem}>
                <span className={styles.historyCommand}>{item.command}</span>
                <span className={styles.historyTime}>{new Date(item.timestamp).toLocaleTimeString()}</span>
                <p className={styles.historyPreview}>{item.result?.substring(0, 100)}{item.result?.length > 100 && '...'}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CfaiInterface;