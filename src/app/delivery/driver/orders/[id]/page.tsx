'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RoleGuard } from '@/components/layout/role-guard';
import { Truck, MapPin, Phone, User, Clock, CheckCircle, Navigation, ChevronLeft, Camera, Package, Loader2, AlertTriangle, Wifi, WifiOff, X, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { deliveryService, type Delivery } from '@/lib/supabase/services/deliveries';
import { orderService } from '@/lib/supabase/services/orders';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

type DeliveryStatus = 'assigned' | 'picked' | 'in_transit' | 'delivered' | 'failed';

interface OrderItem {
  nameAr: string;
  quantity: number;
  price: number;
}

const statusSteps: { key: DeliveryStatus; label: string; icon: any }[] = [
  { key: 'assigned', label: 'تم التعيين', icon: User },
  { key: 'picked', label: 'تم التحميل', icon: Package },
  { key: 'in_transit', label: 'قيد التوصيل', icon: Navigation },
  { key: 'delivered', label: 'تم التوصيل', icon: CheckCircle },
];

export default function DriverOrderDetail() {
  const params = useParams();
  const router = useRouter();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<DeliveryStatus>('assigned');
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const deliveryId = params?.id as string;

  useEffect(() => {
    if (!deliveryId) return;
    loadDelivery();
    const channel = supabase.channel(`delivery-${deliveryId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `id=eq.${deliveryId}` }, (payload) => {
        const updated = payload.new as Delivery;
        setDelivery(updated);
        setStatus(updated.status as DeliveryStatus);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deliveryId]);

  const loadDelivery = async () => {
    try {
      const data = await deliveryService.getById(deliveryId);
      setDelivery(data);
      setStatus(data.status as DeliveryStatus);
      if (data.order_id) {
        const order = await orderService.getById(data.order_id);
        if (order?.items) setOrderItems(typeof order.items === 'string' ? JSON.parse(order.items) : order.items);
      }
    } catch {
      toast.error('فشل تحميل بيانات التوصيل');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = statusSteps.findIndex((s) => s.key === status);
  const isDelivered = status === 'delivered';

  const handleStatusUpdate = async (newStatus: DeliveryStatus) => {
    setUpdating(true);
    try {
      await deliveryService.updateStatus(deliveryId, newStatus);
      setStatus(newStatus);
      toast.success(`تم تحديث الحالة`);
    } catch {
      toast.error('فشل تحديث الحالة');
    } finally {
      setUpdating(false);
    }
  };

  const handlePhotoCapture = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setProofPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1D1D1F';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    if (canvasRef.current) {
      setSignature(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  const handleCompleteDelivery = async () => {
    if (!proofPhoto && !signature) {
      toast.error('الرجاء إضافة صورة إثبات التوصيل أو التوقيع');
      return;
    }
    setUpdating(true);
    try {
      await deliveryService.addProof(deliveryId, proofPhoto || undefined, signature || undefined, deliveryNotes);
      await deliveryService.updateStatus(deliveryId, 'delivered');
      setShowProofModal(false);
      toast.success('تم إكمال التوصيل بنجاح!');
    } catch {
      toast.error('فشل إكمال التوصيل');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 max-w-lg mx-auto flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-muted/30 max-w-lg mx-auto flex items-center justify-center">
        <p className="text-muted-foreground">لم يتم العثور على التوصيل</p>
      </div>
    );
  }

  return (
    <RoleGuard roles={['delivery']}>
      <div className="min-h-screen bg-muted/30 max-w-lg mx-auto pb-8">
        <div className="bg-white dark:bg-card p-4 border-b flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-accent"><ChevronLeft className="h-5 w-5" /></button>
          <div className="flex-1"><h1 className="font-bold">{delivery.order_id}</h1><p className="text-xs text-muted-foreground">تفاصيل الطلب والتوصيل</p></div>
          <div className="flex items-center gap-1 text-xs">
            {isOnline ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-red-500" />}
            <span className={isOnline ? 'text-emerald-600' : 'text-red-600'}>{isOnline ? 'متصل' : 'غير متصل'}</span>
          </div>
        </div>

        <div className="h-48 bg-muted relative flex items-center justify-center border-b">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-1 text-primary" />
            <p className="text-sm font-medium">{delivery.customer_address}</p>
            <p className="text-xs">~{delivery.estimated_minutes} دقيقة</p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, i) => {
              const Icon = step.icon;
              const isActive = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step.key} className="flex flex-col items-center gap-1 relative">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'} ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[10px] text-center ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{step.label}</span>
                  {i < statusSteps.length - 1 && (
                    <div className={`absolute top-5 right-10 w-full h-0.5 -z-10 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-4 space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
                <div><p className="font-semibold">{delivery.customer_name}</p><div className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3 w-3" /> {delivery.customer_phone}</div></div>
                <Button variant="outline" size="sm" className="mr-auto"><Phone className="h-4 w-4" /></Button>
              </div>
              <div className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" /><span>{delivery.customer_address}</span></div>
              {delivery.notes && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{delivery.notes}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">المنتجات ({orderItems.length})</h3>
              <div className="divide-y">
                {orderItems.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 text-sm">
                    <span>{item.nameAr} × {item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {!isDelivered && (
              <>
                {status === 'assigned' && (
                  <Button className="w-full h-12 text-base" onClick={() => handleStatusUpdate('picked')} disabled={updating}>
                    {updating ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Package className="h-5 w-5 ml-2" />}
                    تأكيد تحميل الطلب
                  </Button>
                )}
                {status === 'picked' && (
                  <Button className="w-full h-12 text-base" onClick={() => handleStatusUpdate('in_transit')} disabled={updating}>
                    {updating ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Navigation className="h-5 w-5 ml-2" />}
                    انطلق الآن
                  </Button>
                )}
                {status === 'in_transit' && (
                  <Button className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowProofModal(true)}>
                    <Camera className="h-5 w-5 ml-2" /> إثبات التوصيل
                  </Button>
                )}
              </>
            )}
            {isDelivered && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-600" />
                <p className="font-bold text-emerald-700">تم التوصيل بنجاح</p>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showProofModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
              onClick={() => setShowProofModal(false)}
            >
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-lg bg-background rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">إثبات التوصيل</h2>
                  <button onClick={() => setShowProofModal(false)} className="p-1.5 rounded-lg hover:bg-accent"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">صورة إثبات التوصيل</p>
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                    {proofPhoto ? (
                      <div className="relative rounded-xl overflow-hidden border">
                        <img loading="lazy" src={proofPhoto} alt="Proof" className="w-full h-48 object-cover" />
                        <button onClick={() => setProofPhoto(null)} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <button onClick={handlePhotoCapture} className="w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
                        <Camera className="h-8 w-8 mb-1" /><span className="text-sm">التقط صورة</span><span className="text-xs">للمنتج أو موقع التوصيل</span>
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">توقيع العميل (اختياري)</p>
                      {signature && <button onClick={clearSignature} className="text-xs text-red-500">مسح</button>}
                    </div>
                    <div className={`border-2 rounded-xl overflow-hidden ${signature ? 'border-emerald-200' : 'border-dashed'}`}>
                      <canvas ref={canvasRef} width={400} height={150} className="w-full bg-white touch-none"
                        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">وقع باستخدام الماوس أو اللمس</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">ملاحظات التوصيل</label>
                    <textarea value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="أي ملاحظات إضافية..." className="h-20 w-full rounded-xl border border-input bg-background p-3 text-sm resize-none ring-offset-background focus-visible:outline-none focus-visible:ring-2" />
                  </div>
                  <Button className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleCompleteDelivery} disabled={updating || (!proofPhoto && !signature)}>
                    {updating ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <CheckCircle className="h-5 w-5 ml-2" />}
                    تأكيد اكتمال التوصيل
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RoleGuard>
  );
}
