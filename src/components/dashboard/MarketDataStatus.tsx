import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ChevronRight, Search, X, AlertTriangle, RefreshCw } from 'lucide-react';
import MarketDataService from '../../services/marketDataService';


export const MarketDataStatus = () => {
    const [status, setStatus] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'stocks' | 'mfs' | null>(null);
    const [listData, setListData] = useState<any[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Polling for status updates
    useEffect(() => {
        const checkStatus = () => setStatus(MarketDataService.getCacheStatus());
        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await MarketDataService.refreshAll();
            setStatus(MarketDataService.getCacheStatus());
        } catch (e) {
            console.error("Refresh failed", e);
        } finally {
            setIsRefreshing(false);
        }
    };

    const showList = async (type: 'stocks' | 'mfs') => {
        setIsOpen(false);
        setViewMode(type);
        setIsLoadingList(true);
        try {
            if (type === 'stocks') {
                setListData(await MarketDataService.getAllCachedStocks());
            } else {
                setListData(await MarketDataService.getAllCachedMFs());
            }
        } finally {
            setIsLoadingList(false);
        }
    };

    if (!status) return null;

    const allOk = status.stocks.status === 'success' && status.mfs.status === 'success';

    return (
        <>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    title="Market Data Status"
                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 ${allOk ? 'text-green-600' : 'text-orange-500'}`}
                >
                    {allOk ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Market Data Cache</h3>
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors disabled:opacity-50"
                                    title="Force Refresh Data"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {/* Stocks Item */}
                            <div className="group flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg cursor-pointer transition-colors" onClick={() => showList('stocks')}>
                                <div className="flex items-center">
                                    <div className={`p-2 rounded-md mr-3 ${status.stocks.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {status.stocks.status === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">NSE Equity</p>
                                        <p className="text-xs text-gray-500">{status.stocks.date} • {status.stocks.count.toLocaleString()} items</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            </div>

                            {/* MFs Item */}
                            <div className="group flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg cursor-pointer mt-2 transition-colors" onClick={() => showList('mfs')}>
                                <div className="flex items-center">
                                    <div className={`p-2 rounded-md mr-3 ${status.mfs.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {status.mfs.status === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Mutual Funds</p>
                                        <p className="text-xs text-gray-500">{status.mfs.date} • {status.mfs.count.toLocaleString()} items</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {viewMode && (
                <MarketDataListModal
                    title={viewMode === 'stocks' ? 'NSE Stock Prices' : 'AMFI Mutual Fund NAVs'}
                    data={listData}
                    type={viewMode}
                    isLoading={isLoadingList}
                    onClose={() => setViewMode(null)}
                />
            )}
        </>
    );
};

interface ModalProps {
    title: string;
    data: any[];
    type: 'stocks' | 'mfs';
    isLoading: boolean;
    onClose: () => void;
}

const MarketDataListModal: React.FC<ModalProps> = ({ title, data, type, isLoading, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [displayData, setDisplayData] = useState<any[]>([]);

    useEffect(() => {
        // Simple client-side search/filter
        const filtered = data.filter(item => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return type === 'stocks'
                ? item.symbol.toLowerCase().includes(term)
                : item.name.toLowerCase().includes(term) || item.code.includes(term);
        });
        // Limit to 100 for performance unless searching
        setDisplayData(filtered.slice(0, 100));
    }, [data, searchTerm, type]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                        <p className="text-sm text-gray-500">{data.length.toLocaleString()} total items loaded</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder={type === 'stocks' ? "Search by Symbol..." : "Search by Scheme Name or Code..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : displayData.length > 0 ? (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-gray-500">
                                        {type === 'stocks' ? 'Symbol' : 'Scheme Name'}
                                    </th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-right">
                                        {type === 'stocks' ? 'Price (₹)' : 'NAV (₹)'}
                                    </th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-right">
                                        {type === 'stocks' ? 'Change' : 'Date'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {displayData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                        <td className="px-6 py-3 text-gray-900 dark:text-white font-medium">
                                            {type === 'stocks' ? item.symbol : (
                                                <div>
                                                    <div>{item.name}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{item.code}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right text-gray-900 dark:text-white font-mono">
                                            ₹{(type === 'stocks' ? item.price : item.nav).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            {type === 'stocks' ? (
                                                <span className={item.change >= 0 ? "text-green-600" : "text-red-600"}>
                                                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.changePercent.toFixed(1)}%)
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 text-xs">
                                                    {item.date}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            No items found matching "{searchTerm}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MarketDataStatus;
