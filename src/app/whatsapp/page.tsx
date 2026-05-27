'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { PageTransition } from '@/components/ui/page-transition';
import { MessageCircle, Send, Settings, FileText, Smartphone, Bell, Plus, Play, Pause, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { MESSAGE_TEMPLATES, type MessageTemplate, fillTemplate } from '@/lib/whatsapp/templates';
import toast from 'react-hot-toast';

const tabs = [
  { key: 'dashboard', label: 'لوحة التحكم', icon: Smartphone },
  { key: 'templates', label: 'القوالب', icon: FileText },
  { key: 'settings', label: 'الإعدادات', icon: Settings },
  { key: 'send', label: 'إرسال رسالة', icon: Send },
];

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [templates, setTemplates] = useState(MESSAGE_TEMPLATES);
  const [sendPhone, setSendPhone] = useState('');
  const [sendTemplate, setSendTemplate] = useState('');
  const [sending, setSending] = useState(false);
  const [testVars, setTestVars] = useState<Record<string, string>>({});

  const toggleTemplate = (id: string) => {
    setTemplates(templates.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t));
    toast.success('تم تحديث القالب');
  };

  const handleSendTest = async (template: MessageTemplate) => {
    const vars: Record<string, string> = {};
    template.variables.forEach((v) => { vars[v.name] = testVars[v.name] || v.example; });
    const message = fillTemplate(template, vars);

    if (!sendPhone) { toast.error('أدخل رقم الهاتف'); return; }

    setSending(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({
          to: sendPhone,
          type: 'text',
          text: message,
        }),
      });
      const data = await res.json();
      if (data.success) toast.success('تم إرسال الرسالة بنجاح!');
      else toast.error(data.error || 'فشل الإرسال');
    } catch {
      toast.error('فشل الإرسال');
    } finally { setSending(false); }
  };

  const enabledCount = templates.filter((t) => t.enabled).length;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2"><MessageCircle className="h-6 w-6 text-emerald-500" /><h1 className="text-2xl font-bold">واتساب للتواصل</h1></div>
            <p className="text-muted-foreground">أتمتة رسائل واتساب - إشعارات الطلبات والتوصيل والتنبيهات</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                <Icon className="h-4 w-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <MessageCircle className="h-5 w-5 text-emerald-500 mb-1" />
                  <p className="text-2xl font-bold">{enabledCount}/{templates.length}</p>
                  <p className="text-xs text-muted-foreground">القوالب النشطة</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <Send className="h-5 w-5 text-blue-500 mb-1" />
                  <p className="text-2xl font-bold">1,247</p>
                  <p className="text-xs text-muted-foreground">رسالة مرسلة (شهر)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <CheckCircle className="h-5 w-5 text-emerald-500 mb-1" />
                  <p className="text-2xl font-bold">98.5%</p>
                  <p className="text-xs text-muted-foreground">نسبة التوصيل</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mb-1" />
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">رسالة فاشلة (اليوم)</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['order_confirmation', 'delivery', 'completed', 'alert'] as const).map((cat) => {
                const catTemplates = MESSAGE_TEMPLATES.filter((t) => t.category === cat);
                const catLabels: Record<string, { label: string; color: string }> = {
                  order_confirmation: { label: 'تأكيد الطلبات', color: 'bg-blue-100 text-blue-800' },
                  delivery: { label: 'التوصيل', color: 'bg-amber-100 text-amber-800' },
                  completed: { label: 'الطلبات المكتملة', color: 'bg-emerald-100 text-emerald-800' },
                  alert: { label: 'التنبيهات', color: 'bg-red-100 text-red-800' },
                };
                const info = catLabels[cat];
                return (
                  <Card key={cat}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={info.color}>{info.label}</Badge>
                        <span className="text-xs text-muted-foreground">{catTemplates.filter((t) => t.enabled).length}/{catTemplates.length} نشط</span>
                      </div>
                      {catTemplates.map((t) => (
                        <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{t.titleAr}</p>
                            <p className="text-xs text-muted-foreground">{t.variables.length} متغيرات</p>
                          </div>
                          <Switch checked={t.enabled} onCheckedChange={() => toggleTemplate(t.id)} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Templates */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{template.titleAr}</h3>
                        <Badge variant={template.enabled ? 'success' : 'secondary'}>{template.enabled ? 'مفعل' : 'معطل'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{template.title} • {template.variables.length} متغير</p>
                    </div>
                    <Switch checked={template.enabled} onCheckedChange={() => toggleTemplate(template.id)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium mb-1">القالب (عربي):</p>
                      <pre className="text-xs bg-muted/50 p-3 rounded-xl whitespace-pre-wrap leading-relaxed">{template.bodyAr}</pre>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1">المتغيرات:</p>
                      <div className="space-y-1">
                        {template.variables.map((v) => (
                          <div key={v.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                            <code className="font-mono bg-muted px-1 rounded">{`{{${v.name}}}`}</code>
                            <span className="text-muted-foreground">{v.descriptionAr}</span>
                            <span className="font-mono text-muted-foreground">{v.example}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Send Message */}
        {activeTab === 'send' && (
          <div className="max-w-2xl space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <Input label="رقم الهاتف (مثال: 9665XXXXXXXX)" placeholder="966XXXXXXXXX" value={sendPhone} onChange={(e) => setSendPhone(e.target.value)} dir="ltr" />

                <div>
                  <label className="text-sm font-medium mb-2 block">اختر القالب:</label>
                  <select
                    value={sendTemplate}
                    onChange={(e) => {
                      setSendTemplate(e.target.value);
                      const t = templates.find((t) => t.id === e.target.value);
                      if (t) {
                        const vars: Record<string, string> = {};
                        t.variables.forEach((v) => { vars[v.name] = ''; });
                        setTestVars(vars);
                      }
                    }}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">-- اختر القالب --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.titleAr} {t.enabled ? '' : '(معطل)'}</option>
                    ))}
                  </select>
                </div>

                {sendTemplate && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">المتغيرات:</p>
                    {templates.find((t) => t.id === sendTemplate)?.variables.map((v) => (
                      <Input
                        key={v.name}
                        label={`{{${v.name}}} - ${v.descriptionAr}`}
                        placeholder={v.example}
                        value={testVars[v.name] || ''}
                        onChange={(e) => setTestVars({ ...testVars, [v.name]: e.target.value })}
                      />
                    ))}

                    <div>
                      <p className="text-sm font-medium mb-2">معاينة الرسالة:</p>
                      <div className="bg-muted/50 rounded-xl p-4 whitespace-pre-wrap text-sm leading-relaxed">
                        {(() => {
                          const t = templates.find((t) => t.id === sendTemplate);
                          if (!t) return '';
                          const vars: Record<string, string> = {};
                          t.variables.forEach((v) => { vars[v.name] = testVars[v.name] || `{{${v.name}}}`; });
                          return fillTemplate(t, vars);
                        })()}
                      </div>
                    </div>

                    <Button className="w-full" onClick={() => {
                      const t = templates.find((t) => t.id === sendTemplate);
                      if (t) handleSendTest(t);
                    }} disabled={sending || !sendPhone}>
                      {sending ? 'جاري الإرسال...' : <><Send className="h-4 w-4 ml-1" /> إرسال رسالة تجريبية</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2"><Settings className="h-5 w-5 text-primary" /><h2 className="font-semibold">إعدادات واتساب</h2></div>
              <div className="p-4 rounded-xl bg-muted/50 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">WHATSAPP_PHONE_NUMBER_ID</span><code className="font-mono text-xs">*** ********</code></div>
                <div className="flex justify-between"><span className="text-muted-foreground">WHATSAPP_API_KEY</span><code className="font-mono text-xs">*** ********</code></div>
                <div className="flex justify-between"><span className="text-muted-foreground">WHATSAPP_PHONE_NUMBER</span><code className="font-mono text-xs">+20XXXXXXXXX</code></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Webhook URL</span><code className="font-mono text-xs">https://domain.com/api/whatsapp/webhook</code></div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>قم بتعيين المتغيرات البيئية في ملف .env.local لتشغيل واتساب. راجع .env.local.example للإعدادات المطلوبة.</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
