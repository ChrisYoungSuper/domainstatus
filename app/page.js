'use client';

import React, { useState } from 'react';
import { Download, Play, Trash2, Check, X, Clock, AlertCircle } from 'lucide-react';

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
      
      // 获取最佳协议的结果
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

  const checkDomainsInBatch = async (domainList, batchSize = 5) => {
    const results = [];
    
    for (let i = 0; i < domainList.length; i += batchSize) {
      const batch = domainList.slice(i, i + batchSize);
      const batchPromises = batch.map(domain => checkDomain(domain));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults.filter(r => r !== null));
      setResults(prev => [...prev, ...batchResults.filter(r => r !== null)]);
      setProgress({ current: Math.min(i + batchSize, domainList.length), total: domainList.length });
      
      // 批次之间的延迟
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

    const headers = ['域名', '协议', '状态', '状态码', '状态描述', '响应时间', 'HTTPS可用', 'HTTP可用', '是否重定向', '最终URL', '检测时间'];
    const rows = results.map(r => [
      r.domain,
      r.protocol,
      r.status,
      r.statusCode,
      r.statusText || '',
      r.responseTime,
      r.httpsWorking ? '是' : '否',
      r.httpWorking ? '是' : '否',
      r.redirected ? '是' : '否',
      r.finalUrl || '',
      new Date(r.timestamp).toLocaleString('zh-CN')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `domain-check-${Date.now()}.csv`;
    link.click();
  };

  const reachableCount = results.filter(r => r.status === 'reachable').length;
  const unreachableCount = results.filter(r => r.status === 'unreachable' || r.status === 'error').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">域名状态批量检测工具</h1>
          <p className="text-gray-600">
            ✅ 完整版 - 支持获取真实HTTP状态码、重定向检测、响应时间分析
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">输入域名列表</h2>
            <div className="text-sm text-gray-500">
              每行一个域名，建议每次200个以内
            </div>
          </div>
          
          <textarea
            className="w-full h-64 p-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-mono text-sm"
            placeholder="输入域名，每行一个，例如：&#10;example.com&#10;google.com&#10;github.com"
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            disabled={isChecking}
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCheck}
              disabled={isChecking}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
            >
              <Play size={20} />
              {isChecking ? '检测中...' : '开始检测'}
            </button>
            
            <button
              onClick={handleClear}
              disabled={isChecking}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all font-semibold"
            >
              <Trash2 size={20} />
              清空
            </button>

            {results.length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold shadow-lg ml-auto"
              >
                <Download size={20} />
                导出CSV
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        {isChecking && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-700 font-semibold">检测进度</span>
              <span className="text-gray-600">{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Statistics */}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="text-gray-600 mb-2">总计</div>
              <div className="text-4xl font-bold text-gray-800">{results.length}</div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="text-gray-600 mb-2 flex items-center gap-2">
                <Check className="text-green-600" size={20} />
                可达 (200)
              </div>
              <div className="text-4xl font-bold text-green-600">{reachableCount}</div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="text-gray-600 mb-2 flex items-center gap-2">
                <X className="text-red-600" size={20} />
                不可达
              </div>
              <div className="text-4xl font-bold text-red-600">{unreachableCount}</div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">域名</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">协议</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">状态码</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">响应时间</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">支持协议</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-gray-800">{result.domain}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          result.protocol === 'https' ? 'bg-green-100 text-green-800' : 
                          result.protocol === 'http' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {result.protocol.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          result.statusCode === 200 ? 'bg-green-100 text-green-800' : 
                          result.statusCode >= 300 && result.statusCode < 400 ? 'bg-blue-100 text-blue-800' :
                          result.statusCode >= 400 ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {result.statusCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`flex items-center gap-2 ${
                          result.status === 'reachable' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {result.status === 'reachable' ? (
                            <><Check size={16} /> 可达</>
                          ) : (
                            <><X size={16} /> 不可达</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-2">
                        <Clock size={14} />
                        {result.responseTime}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          {result.httpsWorking && (
                            <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">HTTPS</span>
                          )}
                          {result.httpWorking && (
                            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">HTTP</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
