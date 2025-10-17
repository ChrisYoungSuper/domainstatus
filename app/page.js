'use client';

import React, { useState } from 'react';
import { Download, Play, Trash2, Check, X, Clock, Globe, Shield, AlertCircle, TrendingUp, Filter } from 'lucide-react';

export default function DomainChecker() {
  const [domains, setDomains] = useState('');
  const [results, setResults] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const checkDomain = async (domain) => {
    const cleanDomain = domain.trim();
    if (!cleanDomain) return null;

    try {
      const response = await fetch('/api/check-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: cleanDomain }),
      });

      const data = await response.json();
      
      const bestResult = data.bestProtocol ? data[data.bestProtocol] : null;
      
      return {
        domain: cleanDomain,
        protocol: data.bestProtocol || 'N/A',
        status: data.status,
        statusCode: bestResult?.statusCode || 'Failed',
        statusText: bestResult?.statusText || '',
        responseTime: bestResult?.responseTime ? `${bestResult.responseTime}ms` : 'N/A',
        redirected: bestResult?.redirected || false,
        finalUrl: bestResult?.finalUrl || '',
        httpsWorking: data.https?.reachable || false,
        httpWorking: data.http?.reachable || false,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        domain: cleanDomain,
        protocol: 'N/A',
        status: 'error',
        statusCode: 'Error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  };

  const checkDomainsInBatch = async (domainList, batchSize = 15) => {
    const results = [];
    
    for (let i = 0; i < domainList.length; i += batchSize) {
      const batch = domainList.slice(i, i + batchSize);
      const batchPromises = batch.map(domain => checkDomain(domain));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults.filter(r => r !== null));
      setResults(prev => [...prev, ...batchResults.filter(r => r !== null)]);
      setProgress({ current: Math.min(i + batchSize, domainList.length), total: domainList.length });
      
      if (i + batchSize < domainList.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  };

  const handleCheck = async () => {
    const domainList = domains
      .split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    if (domainList.length === 0) {
      alert('请输入域名列表');
      return;
    }

    if (domainList.length > 500) {
      if (!confirm('域名数量较多，检测可能需要较长时间。是否继续？')) {
        return;
      }
    }

    setIsChecking(true);
    setResults([]);
    setProgress({ current: 0, total: domainList.length });

    await checkDomainsInBatch(domainList);
    setIsChecking(false);
  };

  const handleClear = () => {
    setDomains('');
    setResults([]);
    setProgress({ current: 0, total: 0 });
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    // 只导出：状态可达 + 没有重定向的域名
    const filteredResults = results.filter(r => r.status === 'reachable' && !r.redirected);
    
    if (filteredResults.length === 0) {
      alert('没有符合条件的域名（可达且无重定向）');
      return;
    }

    const headers = ['域名', '协议', '状态码', '响应时间', '检测时间'];
    const rows = filteredResults.map(r => [
      r.domain,
      r.protocol,
      r.statusCode,
      r.responseTime,
      new Date(r.timestamp).toLocaleString('zh-CN')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clean-domains-${Date.now()}.csv`;
    link.click();
  };

  const reachableCount = results.filter(r => r.status === 'reachable').length;
  const unreachableCount = results.filter(r => r.status === 'unreachable' || r.status === 'error').length;
  const cleanDomainsCount = results.filter(r => r.status === 'reachable' && !r.redirected).length;
  const redirectedCount = results.filter(r => r.redirected).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl shadow-2xl p-8 md:p-12 mb-8">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Globe className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
                  域名批量检测
                </h1>
                <p className="text-blue-100 text-lg">
                  快速检测HTTP状态 · 识别可用域名 · 过滤重定向
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Check className="w-5 h-5 text-green-300" />
                <span className="text-white font-semibold">真实状态码</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Shield className="w-5 h-5 text-blue-300" />
                <span className="text-white font-semibold">HTTPS检测</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <TrendingUp className="w-5 h-5 text-purple-300" />
                <span className="text-white font-semibold">批量15并发</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Filter className="w-5 h-5 text-yellow-300" />
                <span className="text-white font-semibold">智能过滤</span>
              </div>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 md:mb-0">
              输入域名列表
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
              <AlertCircle size={16} />
              <span>建议每次200-300个域名</span>
            </div>
          </div>
          
          <textarea
            className="w-full h-72 p-5 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all font-mono text-sm bg-gray-50 resize-none shadow-inner"
            placeholder="粘贴域名列表，每行一个：&#10;&#10;example.com&#10;google.com&#10;github.com&#10;..."
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            disabled={isChecking}
          />

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={handleCheck}
              disabled={isChecking}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all font-bold shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              <Play size={20} />
              {isChecking ? '检测中...' : '开始检测'}
            </button>
            
            <button
              onClick={handleClear}
              disabled={isChecking}
              className="flex items-center gap-2 px-8 py-4 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all font-bold shadow-lg"
            >
              <Trash2 size={20} />
              清空
            </button>

            {results.length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all font-bold shadow-xl ml-auto transform hover:scale-105"
              >
                <Download size={20} />
                导出纯净域名 ({cleanDomainsCount})
              </button>
            )}
          </div>

          {results.length > 0 && cleanDomainsCount > 0 && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-start gap-3">
              <Filter className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <strong>导出说明：</strong>只会导出 <strong className="text-green-700">{cleanDomainsCount}</strong> 个状态为"可达"且没有重定向的纯净域名
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isChecking && (
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-8">
            <div className="flex justify-between mb-3">
              <span className="text-gray-700 font-bold text-lg">检测进度</span>
              <span className="text-gray-600 font-semibold">{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="mt-3 text-center text-sm text-gray-500">
              正在高速检测中... (15个并发)
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
              <div className="text-blue-100 mb-2 text-sm font-semibold">总计</div>
              <div className="text-5xl font-black">{results.length}</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
              <div className="flex items-center gap-2 text-green-100 mb-2 text-sm font-semibold">
                <Check size={18} />
                可达
              </div>
              <div className="text-5xl font-black">{reachableCount}</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
              <div className="flex items-center gap-2 text-purple-100 mb-2 text-sm font-semibold">
                <Filter size={18} />
                纯净
              </div>
              <div className="text-5xl font-black">{cleanDomainsCount}</div>
            </div>
            
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
              <div className="flex items-center gap-2 text-red-100 mb-2 text-sm font-semibold">
                <X size={18} />
                不可达
              </div>
              <div className="text-5xl font-black">{unreachableCount}</div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800">检测结果</h3>
              <p className="text-gray-600 mt-1">共 {results.length} 个域名，其中 {cleanDomainsCount} 个纯净可用</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">域名</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">协议</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">状态码</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">重定向</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">响应</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((result, index) => {
                    const isClean = result.status === 'reachable' && !result.redirected;
                    return (
                      <tr 
                        key={index} 
                        className={`hover:bg-gray-50 transition-colors ${isClean ? 'bg-green-50/50' : ''}`}
                      >
                        <td className="px-6 py-4 text-sm font-mono text-gray-800 font-semibold">
                          {result.domain}
                          {isClean && (
                            <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">✓ 纯净</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                            result.protocol === 'https' ? 'bg-green-100 text-green-800' : 
                            result.protocol === 'http' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.protocol.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                            result.statusCode === 200 ? 'bg-green-100 text-green-800' : 
                            result.statusCode >= 300 && result.statusCode < 400 ? 'bg-blue-100 text-blue-800' :
                            result.statusCode >= 400 ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.statusCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`flex items-center gap-2 font-semibold ${
                            result.status === 'reachable' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.status === 'reachable' ? (
                              <><Check size={16} /> 可达</>
                            ) : (
                              <><X size={16} /> 失败</>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {result.redirected ? (
                            <span className="text-orange-600 font-semibold">是</span>
                          ) : (
                            <span className="text-gray-400">否</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-2">
                          <Clock size={14} />
                          <span className="font-mono">{result.responseTime}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-white/60 text-sm">
          <p>批量域名检测工具 · 快速高效 · 智能过滤</p>
        </div>
      </div>
    </div>
  );
}
