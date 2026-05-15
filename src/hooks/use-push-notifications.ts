import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = "BOjEz5Lr0Flm_VoksTdSl-u7T8sqknDYVnkckuH8AT88WNYxdYwWo5MP59qIOgBXNpa_HetUGfLRu5iXYGJ4TyY";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" ? Notification.permission : "default"
  );

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeUser = async () => {
    if (!user) return;
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // @ts-ignore - push_subscriptions might not be in types yet
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          subscription: subscription.toJSON(),
        }, {
          onConflict: 'user_id, subscription'
        });

      if (error) throw error;
      
      setPermission("granted");
      console.log("Push subscription successful", subscription);
    } catch (err) {
      console.error("Subscription failed:", err);
    }
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support notifications");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      await subscribeUser();
      toast.success("Push notifications enabled!");
    } else if (result === "denied") {
      toast.error("Notifications were denied. Please enable them in your browser settings.");
    }
  };

  useEffect(() => {
    if (user && permission === "granted") {
      subscribeUser();
    }
  }, [user]);

  return { permission, requestPermission };
};
