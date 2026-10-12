/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header';
import { WifiAnalyzerView } from './components/WifiAnalyzerView';
import { SpeedtestDashboard } from './components/SpeedtestDashboard';
import { RecommendationsView } from './components/RecommendationsView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { SupportReportView } from './components/SupportReportView';
import { LanScannerView } from './components/LanScannerView';
import { NetworkStatusGuard } from './components/NetworkStatusGuard';
import { DonateModal } from './components/DonateModal';
import { WifiAccuracyDisclaimer } from './components/WifiAccuracyDisclaimer';
import { RouterWebModal } from './components/RouterWebModal';
import { ThemeProvider } from './context/ThemeContext';
import { wifiScanner } from './services/wifiScan';
import { WifiNetwork, SpeedtestResult, WifiBand } from './types/wifi';
import { fetchIpAndIspInfo } from './services/networkTester';
import { openRouterWebDirect } from './utils/routerNav';
import { androidSystem } from './services/androidSystem';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analyzer');
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [speedtestResult] = useState<SpeedtestResult | null>(null);
  const [ispName, setIspName] = useState<string>('');
  
  const [isWifiConnected, setIsWifiConnected] = useState<boolean>(true);
  const [isCellular, setIsCellular] = useState<boolean>(false);
  const [isVpn, setIsVpn] = useState<boolean>(false);

  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isRouterModalOpen, setIsRouterModalOpen] = useState(false);

  useEffect(() => {
    androidSystem.requestAllStartupPermissions();
  }, []);

  useEffect(() => {
    const unsubscribe = wifiScanner.subscribe(updatedNetworks => {
      setNetworks(updatedNetworks);
    });

    fetchIpAndIspInfo().then(info => {
      if (info?.isp) setIspName(info.isp);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isWifiConnected) {
      wifiScanner.populateConnectedWifi({
        isp: ispName,
        gatewayIp: '192.168.1.1',
      });
    } else {
      wifiScanner.clearNetworks();
    }
  }, [isWifiConnected, ispName]);

  const handleOpenRouter = (_band?: WifiBand | React.MouseEvent) => {
    setIsRouterModalOpen(true);
    openRouterWebDirect('192.168.1.1');
  };

  const visibleNetworks = isWifiConnected ? networks : [];
  const connectedNet = isWifiConnected ? (networks.find(n => n.isConnected) || null) : null;
  const hasConnectedWifi = isWifiConnected && !!connectedNet;

  return (
    <ThemeProvider>
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
        
        <Header 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenDonate={() => setIsDonateOpen(true)}
          onOpenApkModal={() => setIsApkModalOpen(true)}
          onOpenRouterWeb={handleOpenRouter}
          connectedSsid={connectedNet?.ssid}
          connectedSignalDbm={connectedNet?.level}
          isWifiConnected={isWifiConnected}
          isCellular={isCellular}
          isVpn={isVpn}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-6 pb-28 lg:pb-8 space-y-4 sm:space-y-6 overflow-x-hidden">
          
          <NetworkStatusGuard 
            ispName={ispName}
            hasConnectedWifi={hasConnectedWifi}
            onRefreshWifiScan={() => wifiScanner.triggerScan()}
            onConnectionStatusChange={status => {
              setIsWifiConnected(status.isWifiConnected);
              setIsCellular(status.isCellular);
              setIsVpn(status.isVpn);
            }}
          />

          {activeTab === 'analyzer' && (
            <WifiAnalyzerView 
              networks={visibleNetworks}
              onNavigateToRouter={handleOpenRouter}
              isCellular={isCellular}
            />
          )}

          {activeTab === 'scanner' && (
            <LanScannerView 
              gatewayIp="192.168.1.1"
              isWifiConnected={isWifiConnected}
              isCellular={isCellular}
            />
          )}

          {activeTab === 'speedtest' && (
            <SpeedtestDashboard />
          )}

          {activeTab === 'recommendations' && (
            <RecommendationsView 
              networks={visibleNetworks}
              onNavigateToRouter={handleOpenRouter}
              isCellular={isCellular}
            />
          )}

          {activeTab === 'report' && (
            <SupportReportView 
              networks={visibleNetworks}
              speedtestResult={speedtestResult}
              isCellular={isCellular}
              isWifiConnected={isWifiConnected}
              isVpn={isVpn}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeBaseView />
          )}

        </main>

        <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500 w-full max-w-full overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <div>
              <span className="font-semibold text-slate-400">WiFi Expert &amp; Helper • Помощник инженера</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
              <button 
                onClick={handleOpenRouter}
                className="hover:text-indigo-400 transition-colors cursor-pointer"
                title="Веб-интерфейс шлюза (192.168.1.1)"
              >
                Роутер (192.168.1.1)
              </button>
              <span className="hidden xs:inline">•</span>
              <button 
                onClick={() => setIsApkModalOpen(true)}
                className="hover:text-cyan-400 transition-colors cursor-pointer"
              >
                Сборка Android APK на GitHub
              </button>
              <span className="hidden xs:inline">•</span>
              <button 
                onClick={() => setIsDonateOpen(true)}
                className="hover:text-emerald-400 transition-colors cursor-pointer font-semibold"
              >
                Донат (Сбербанк)
              </button>
            </div>
          </div>
        </footer>

        <DonateModal 
          isOpen={isDonateOpen} 
          onClose={() => setIsDonateOpen(false)} 
        />
        
        <WifiAccuracyDisclaimer 
          isOpen={isApkModalOpen} 
          onClose={() => setIsApkModalOpen(false)} 
        />

        <RouterWebModal
          isOpen={isRouterModalOpen}
          onClose={() => setIsRouterModalOpen(false)}
          defaultGateway="192.168.1.1"
          isWifiConnected={isWifiConnected}
        />
      </div>
    </ThemeProvider>
  );
}
