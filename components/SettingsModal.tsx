import React, { useState, useEffect } from 'react';
import { PromptConfig, DEFAULT_PROMPTS } from '../types';
import { X, Save, RotateCcw, Database, Zap } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalTokensUsed: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, totalTokensUsed }) => {
  const [apiKey, setApiKey] = useState('');
  const [prompts, setPrompts] = useState<PromptConfig>(DEFAULT_PROMPTS);
  const [storageSize, setStorageSize] = useState<string>('0 B');

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem('ds_api_key') || '');
      const savedPrompts = localStorage.getItem('ds_prompts');
      if (savedPrompts) {
        setPrompts(JSON.parse(savedPrompts));
      }
      calculateStorage();
    }
  }, [isOpen]);

  const calculateStorage = () => {
      let totalBytes = 0;
      const appKeys = ['lf_history', 'lf_saved_words', 'ds_api_key', 'ds_prompts'];
      
      appKeys.forEach(key => {
          const item = localStorage.getItem(key);
          if (item) {
              // Approximate byte size (UTF-16 = 2 bytes per char)
              totalBytes += item.length * 2;
          }
      });

      if (totalBytes === 0) {
          setStorageSize('0 B');
          return;
      }

      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(totalBytes) / Math.log(k));
      setStorageSize(parseFloat((totalBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]);
  };

  const handleSave = () => {
    localStorage.setItem('ds_api_key', apiKey);
    localStorage.setItem('ds_prompts', JSON.stringify(prompts));
    onClose();
  };

  const handleReset = () => {
    if(confirm("Reset all prompts to default?")) {
        setPrompts(DEFAULT_PROMPTS);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Stats Section */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Total Tokens
                    </span>
                    <span className="text-2xl font-black text-blue-900">{totalTokensUsed.toLocaleString()}</span>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Database className="w-3 h-3" /> Storage Used
                    </span>
                    <span className="text-2xl font-black text-purple-900">{storageSize}</span>
                </div>
            </div>

            <hr className="border-gray-100" />

          {/* API Key Section */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">DeepSeek API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
                Key is stored locally in your browser. Get one at <a href="https://platform.deepseek.com/" target="_blank" className="text-blue-600 underline">platform.deepseek.com</a>.
            </p>
          </div>

          <hr className="border-gray-100" />

          {/* Prompts Section */}
          <div className="flex justify-between items-center">
             <h3 className="text-lg font-bold text-gray-800">Prompt Customization</h3>
             <button onClick={handleReset} className="text-xs flex items-center gap-1 text-gray-500 hover:text-red-500">
                <RotateCcw className="w-3 h-3" /> Reset Defaults
             </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Content Generation</label>
              <textarea
                value={prompts.generate}
                onChange={(e) => setPrompts({...prompts, generate: e.target.value})}
                className="w-full h-24 p-3 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="text-[10px] text-gray-400 mt-1">Vars: {'{topic}, {difficulty}, {length}'}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-green-600 uppercase mb-1">Text Analysis</label>
              <textarea
                value={prompts.analyze}
                onChange={(e) => setPrompts({...prompts, analyze: e.target.value})}
                className="w-full h-20 p-3 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-600 uppercase mb-1">Evaluation & Grading</label>
              <textarea
                value={prompts.evaluate}
                onChange={(e) => setPrompts({...prompts, evaluate: e.target.value})}
                className="w-full h-24 p-3 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
              />
               <div className="text-[10px] text-gray-400 mt-1">Vars: {'{original}, {translation}'}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-orange-600 uppercase mb-1">Word Lookup</label>
              <textarea
                value={prompts.lookup}
                onChange={(e) => setPrompts({...prompts, lookup: e.target.value})}
                className="w-full h-20 p-3 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-orange-500 outline-none"
              />
               <div className="text-[10px] text-gray-400 mt-1">Vars: {'{word}, {context}'}</div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Save className="w-5 h-5" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};