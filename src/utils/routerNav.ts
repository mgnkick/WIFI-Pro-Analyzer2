/**
 * Direct router gateway opening without intermediate screens
 */
export const openRouterWebDirect = (defaultGateway: string = '192.168.1.1') => {
  const storedIp = localStorage.getItem('router_gateway_ip');
  const ip = storedIp && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(storedIp) 
    ? storedIp 
    : defaultGateway;
  const targetUrl = `http://${ip}`;

  try {
    const newWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch {
    window.location.href = targetUrl;
  }
};
