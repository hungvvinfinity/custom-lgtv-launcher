/**
 * Luna Service Bridge Module
 * Safely calls webOS services with Root Bridge elevation through hbchannel.service
 */
const Luna = (function () {
  const isWebOS = typeof window.PalmServiceBridge !== 'undefined';
  const HELPER_SCRIPT = '/media/developer/apps/usr/palm/applications/vn.hungvu.tvlauncher/tools/list-apps.js';

  function call(uri, params) {
    return new Promise((resolve, reject) => {
      if (!isWebOS) {
        console.warn('Luna: Not on webOS. Using mock for:', uri);
        return resolve(getMockResponse(uri, params));
      }

      try {
        const bridge = new window.PalmServiceBridge();
        const payload = typeof params === 'string' ? params : JSON.stringify(params || {});

        bridge.onservicecallback = (responseString) => {
          try {
            const data = JSON.parse(responseString);
            resolve(data);
          } catch (err) {
            console.error('Luna: Parse error', err, responseString);
            reject(err);
          }
        };

        bridge.call(uri, payload);
      } catch (err) {
        console.error('Luna: Bridge exception', uri, err);
        reject(err);
      }
    });
  }

  // Execute shell command via hbchannel root service
  async function exec(command) {
    try {
      const res = await call('luna://org.webosbrew.hbchannel.service/exec', { command: command });
      if (res && res.returnValue && typeof res.stdoutString === 'string') {
        return res.stdoutString.trim();
      }
    } catch (e) {
      console.warn('Luna.exec failed:', e);
    }
    return null;
  }

  // Get full list of installed applications
  async function listApps() {
    // 1. Try via hbchannel root helper (fastest, complete app inventory)
    try {
      const output = await exec(`node ${HELPER_SCRIPT}`);
      if (output && output.startsWith('[')) {
        const apps = JSON.parse(output);
        if (Array.isArray(apps) && apps.length > 0) {
          console.log(`Luna: Retrieved ${apps.length} apps via root helper.`);
          return apps;
        }
      }
    } catch (e) {
      console.warn('Luna: Root helper listApps failed, falling back...', e);
    }

    // 2. Direct Luna listLaunchPoints call (works directly without extra permissions)
    try {
      const resLP = await call('luna://com.webos.applicationManager/listLaunchPoints', {});
      if (resLP && resLP.returnValue && Array.isArray(resLP.launchPoints)) {
        return resLP.launchPoints.map(lp => ({
          id: lp.id,
          title: lp.title || lp.id,
          icon: lp.icon || lp.mediumLargeIcon || lp.largeIcon || '',
          folderPath: lp.folderPath || ''
        }));
      }
    } catch (e) {
      console.warn('Luna: listLaunchPoints call failed:', e);
    }

    // 3. Direct Luna listApps call
    try {
      const res = await call('luna://com.webos.applicationManager/listApps', {});
      if (res && res.returnValue && Array.isArray(res.apps)) {
        return res.apps;
      }
    } catch (e) {
      console.warn('Luna: Direct listApps failed, trying dev/listApps...', e);
    }

    // 3. Fallback to dev/listApps
    try {
      const resDev = await call('luna://com.webos.applicationManager/dev/listApps', {});
      if (resDev && resDev.returnValue && Array.isArray(resDev.apps)) {
        return resDev.apps;
      }
    } catch (e) {
      console.warn('Luna: dev/listApps failed:', e);
    }

    return [];
  }

  // Launch application by ID
  async function launchApp(appId, params) {
    console.log('Luna: Launching app:', appId);

    // 1. Launch via root command (works 100% reliably for all DRM/OEM apps)
    try {
      const cleanAppId = appId.replace(/[^a-zA-Z0-9._-]/g, '');
      const paramStr = params ? JSON.stringify(params).replace(/'/g, "'\\''") : '{}';
      const cmd = `luna-send -n 1 luna://com.webos.applicationManager/launch '{"id":"${cleanAppId}","params":${paramStr}}'`;
      const out = await exec(cmd);
      if (out && out.includes('"returnValue":true')) {
        return true;
      }
      console.warn('Luna: Root launch did not return true, falling back to direct bridge:', out);
    } catch (e) {
      console.warn('Luna: Root launch failed, trying direct bridge...', e);
    }

    // 2. Direct bridge fallback
    try {
      const res = await call('luna://com.webos.applicationManager/launch', {
        id: appId,
        params: params || {}
      });
      return res && res.returnValue === true;
    } catch (e) {
      console.error('Luna.launchApp failed completely:', appId, e);
      return false;
    }
  }

  // Fallback mock responses for browser development preview
  function getMockResponse(uri, params) {
    if (uri.includes('listApps')) {
      return {
        returnValue: true,
        apps: [
          { id: 'youtube.leanback.v4', title: 'YouTube', icon: 'assets/icons/youtube.png', visible: true },
          { id: 'com.vtvgotv.app', title: 'VTV Go', icon: 'assets/icons/vtvgo.png', visible: true },
          { id: 'com.fpt.fptplay', title: 'FPT Play', icon: 'assets/icons/fptplay.png', visible: true },
          { id: 'netflix', title: 'Netflix', icon: 'assets/icons/netflix.png', visible: true },
          { id: 'vieplay.vn', title: 'VieON', icon: 'assets/icons/vieon.png', visible: true }
        ]
      };
    }
    if (uri.includes('launch')) {
      alert('[Dev Mock] Mở ứng dụng: ' + JSON.stringify(params));
      return { returnValue: true };
    }
    if (uri.includes('tvpower') || uri.includes('powerOff')) {
      console.log('[Dev Mock] Luna TV Power Off executed with params:', params);
      return { returnValue: true, state: 'powerOff' };
    }
    return { returnValue: false, errorText: 'Unsupported mock service' };
  }

  // Request TV Power Off
  async function powerOff(reason = 'autoOff') {
    console.log('Luna: Requesting TV Power Off with reason:', reason);
    try {
      const res = await call('luna://com.webos.service.tvpower/power/powerOff', { reason: reason });
      if (res && res.returnValue) {
        return true;
      }
      if (reason === 'autoOff') {
        const fallbackRes = await call('luna://com.webos.service.tvpower/power/powerOff', { reason: 'offTimer' });
        if (fallbackRes && fallbackRes.returnValue) {
          return true;
        }
      }
    } catch (e) {
      console.warn('Luna: Direct powerOff call failed, trying root exec...', e);
    }

    try {
      const resExec = await exec(`luna-send -n 1 luna://com.webos.service.tvpower/power/powerOff '{"reason":"${reason}"}'`);
      if (resExec && resExec.includes('"returnValue":true')) {
        return true;
      }
    } catch (e) {
      console.error('Luna: Root powerOff fallback failed:', e);
    }

    return false;
  }

  return {
    isWebOS,
    call,
    exec,
    listApps,
    launchApp,
    powerOff
  };
})();
