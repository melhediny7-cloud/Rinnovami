import { DocumentItem, Language } from '../types';
import { getDaysRemaining } from './dateUtils';

const LOCAL_NOTIF_DISPATCH_KEY = 'rinnovami_local_notif_last_day';

/**
 * Register Service Worker for PWA offline capabilities and background notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('./sw.js', {
      scope: './',
    });

    console.log('Rinnovami PWA Service Worker registered successfully:', registration.scope);
    return registration;
  } catch (err) {
    console.warn('Service Worker registration note:', err);
    return null;
  }
}

/**
 * Check if the browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission state
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Request permission from the user to send native device notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.warn('Notification permission error:', err);
    return false;
  }
}

/**
 * Trigger a native local notification immediately on the user's phone or desktop
 */
export async function showLocalNotification(
  title: string,
  options: NotificationOptions = {}
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const defaultOptions: any = {
    icon: './pwa-icon-192.png',
    badge: './favicon-64.png',
    vibrate: [200, 100, 200],
    ...options,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    }

    // Fallback if service worker not ready
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    console.warn('Native notification trigger fallback:', err);
    try {
      new Notification(title, defaultOptions);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Check expiring documents and trigger native local notification once per day
 */
export async function checkAndTriggerLocalNotifications(
  documents: DocumentItem[],
  lang: Language = 'it'
): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const lastDispatched = localStorage.getItem(LOCAL_NOTIF_DISPATCH_KEY);

  // Limit local device notification to at most once per day
  if (lastDispatched === todayStr) {
    return;
  }

  const activeExpiring = documents.filter((d) => {
    if (d.hasNoExpiry || !d.expiryDate) return false;
    const days = getDaysRemaining(d.expiryDate);
    return days >= 0 && days <= 90;
  });

  const expired = documents.filter((d) => {
    if (d.hasNoExpiry || !d.expiryDate) return false;
    const days = getDaysRemaining(d.expiryDate);
    return days < 0;
  });

  if (activeExpiring.length === 0 && expired.length === 0) {
    return;
  }

  let title = '';
  let body = '';

  if (expired.length > 0) {
    title = lang === 'ar' ? '⚠️ تنبيه Rinnovami: وثيقة منتهية الصلاحية!' : '⚠️ Rinnovami: Documento Scaduto!';
    body = lang === 'ar'
      ? `لديك (${expired.length}) وثيقة منتهية الصلاحية تتطلب التجديد الفوري: ${expired[0].title}`
      : `Hai (${expired.length}) documenti scaduti da rinnovare subito: ${expired[0].title}`;
  } else if (activeExpiring.length > 0) {
    const closest = activeExpiring.sort((a, b) => getDaysRemaining(a.expiryDate) - getDaysRemaining(b.expiryDate))[0];
    const days = getDaysRemaining(closest.expiryDate);

    title = lang === 'ar' ? '🔔 تذكير موعد انتهاء وثيقة (Rinnovami)' : '🔔 Promemoria Scadenza Rinnovami';
    body = lang === 'ar'
      ? `${closest.title} ينتهي خلال ${days} يوماً. ابدأ تجهيز موعد التجديد!`
      : `${closest.title} scade tra ${days} giorni. Inizia a preparare la pratica di rinnovo!`;
  }

  const sent = await showLocalNotification(title, {
    body,
    tag: 'rinnovami-expiry-alert',
  });

  if (sent) {
    localStorage.setItem(LOCAL_NOTIF_DISPATCH_KEY, todayStr);
  }
}
