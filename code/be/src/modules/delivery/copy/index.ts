import { resolveLocale, type Locale } from '../../../common/locale';

const en = {
  someone: 'Someone',
  group: 'a group',
  ledger: 'this ledger',
  directLedger: 'your shared balance',
  'expense.created.title': 'Expense added',
  'expense.replaced.title': 'Expense updated',
  'expense.deleted.title': 'Expense deleted',
  'settlement.created.title': 'Settlement added',
  'settlement.replaced.title': 'Settlement updated',
  'settlement.deleted.title': 'Settlement deleted',
  'expense.created.body': '{actor} added an expense.',
  'expense.created.bodyWithLedger': '{actor} added an expense in {ledger}.',
  'expense.replaced.body': '{actor} updated an expense.',
  'expense.replaced.bodyWithLedger': '{actor} updated an expense in {ledger}.',
  'expense.deleted.body': '{actor} deleted an expense.',
  'expense.deleted.bodyWithLedger': '{actor} deleted an expense in {ledger}.',
  'settlement.created.body': '{actor} added a settlement.',
  'settlement.created.bodyWithLedger':
    '{actor} added a settlement in {ledger}.',
  'settlement.replaced.body': '{actor} updated a settlement.',
  'settlement.replaced.bodyWithLedger':
    '{actor} updated a settlement in {ledger}.',
  'settlement.deleted.body': '{actor} deleted a settlement.',
  'settlement.deleted.bodyWithLedger':
    '{actor} deleted a settlement in {ledger}.',
  'group.invitation_sent.title': 'Group invitation',
  'group.invitation_sent.body': '{actor} invited you to {ledger}.',
  'connection.created.title': 'Connection request',
  'connection.created.body': '{actor} sent you a connection request.',
  'connection.accepted.title': 'Connection accepted',
  'connection.accepted.body': '{actor} accepted your connection request.',
  'reminder.created.title': 'Balance reminder from {actor}',
  'reminder.created.body': 'You have an unsettled balance in {ledger}.',
  'reset.subject': 'Reset your Tally Stick password',
  'reset.intro':
    'Someone asked to reset the password for your Tally Stick account.',
  'reset.instructions':
    'Open this link on the phone where Tally Stick is installed to choose a new password. It expires in {minutes} minutes and works once.',
  'reset.ignore':
    "If you didn't ask for this, ignore this email. Your password won't change.",
};

type Copy = Record<keyof typeof en, string>;
export type CopyKey = keyof Copy;

export interface NotificationCopy {
  title: CopyKey;
  body: CopyKey;
  actorName: string | null;
  ledgerName: string | null;
  ledgerFallback: 'ledger' | 'directLedger' | 'group';
}

const translations: Record<Locale, Copy> = {
  en,
  'ur-Latn-PK': {
    someone: 'Kisi',
    group: 'ek group',
    ledger: 'is hisaab',
    directLedger: 'aap ke mushtarka hisaab',
    'expense.created.title': 'Kharcha add hua',
    'expense.replaced.title': 'Kharcha update hua',
    'expense.deleted.title': 'Kharcha delete hua',
    'settlement.created.title': 'Adaigi add hui',
    'settlement.replaced.title': 'Adaigi update hui',
    'settlement.deleted.title': 'Adaigi delete hui',
    'expense.created.body': '{actor} ne kharcha add kiya.',
    'expense.created.bodyWithLedger':
      '{actor} ne {ledger} mein kharcha add kiya.',
    'expense.replaced.body': '{actor} ne kharcha update kiya.',
    'expense.replaced.bodyWithLedger':
      '{actor} ne {ledger} mein kharcha update kiya.',
    'expense.deleted.body': '{actor} ne kharcha delete kiya.',
    'expense.deleted.bodyWithLedger':
      '{actor} ne {ledger} mein kharcha delete kiya.',
    'settlement.created.body': '{actor} ne adaigi add ki.',
    'settlement.created.bodyWithLedger':
      '{actor} ne {ledger} mein adaigi add ki.',
    'settlement.replaced.body': '{actor} ne adaigi update ki.',
    'settlement.replaced.bodyWithLedger':
      '{actor} ne {ledger} mein adaigi update ki.',
    'settlement.deleted.body': '{actor} ne adaigi delete ki.',
    'settlement.deleted.bodyWithLedger':
      '{actor} ne {ledger} mein adaigi delete ki.',
    'group.invitation_sent.title': 'Group ki dawat',
    'group.invitation_sent.body': '{actor} ne aap ko {ledger} mein bulaya hai.',
    'connection.created.title': 'Connection request',
    'connection.created.body':
      '{actor} ne aap ko connection request bheji hai.',
    'connection.accepted.title': 'Connection qabool ho gaya',
    'connection.accepted.body':
      '{actor} ne aap ki connection request qabool kar li.',
    'reminder.created.title': '{actor} ki taraf se hisaab ki yaad-dihani',
    'reminder.created.body': '{ledger} mein aap ka hisaab abhi baqi hai.',
    'reset.subject': 'Apna Tally Stick password reset karein',
    'reset.intro':
      'Kisi ne aap ke Tally Stick account ka password reset karne ki darkhwast ki hai.',
    'reset.instructions':
      'Naya password chunne ke liye yeh link us phone par kholein jis mein Tally Stick hai. Yeh {minutes} minute mein expire ho jayega aur sirf ek baar chalega.',
    'reset.ignore':
      'Agar aap ne yeh darkhwast nahi ki, to is email ko nazarandaz karein. Aap ka password nahi badlega.',
  },
  'ur-PK': {
    someone: 'کسی',
    group: 'ایک گروپ',
    ledger: 'اس حساب',
    directLedger: 'آپ کے مشترکہ حساب',
    'expense.created.title': 'خرچہ شامل ہوا',
    'expense.replaced.title': 'خرچہ اپ ڈیٹ ہوا',
    'expense.deleted.title': 'خرچہ حذف ہوا',
    'settlement.created.title': 'ادائیگی شامل ہوئی',
    'settlement.replaced.title': 'ادائیگی اپ ڈیٹ ہوئی',
    'settlement.deleted.title': 'ادائیگی حذف ہوئی',
    'expense.created.body': '{actor} نے ایک خرچہ شامل کیا۔',
    'expense.created.bodyWithLedger':
      '{actor} نے {ledger} میں ایک خرچہ شامل کیا۔',
    'expense.replaced.body': '{actor} نے ایک خرچہ اپ ڈیٹ کیا۔',
    'expense.replaced.bodyWithLedger':
      '{actor} نے {ledger} میں ایک خرچہ اپ ڈیٹ کیا۔',
    'expense.deleted.body': '{actor} نے ایک خرچہ حذف کیا۔',
    'expense.deleted.bodyWithLedger':
      '{actor} نے {ledger} میں ایک خرچہ حذف کیا۔',
    'settlement.created.body': '{actor} نے ایک ادائیگی شامل کی۔',
    'settlement.created.bodyWithLedger':
      '{actor} نے {ledger} میں ایک ادائیگی شامل کی۔',
    'settlement.replaced.body': '{actor} نے ایک ادائیگی اپ ڈیٹ کی۔',
    'settlement.replaced.bodyWithLedger':
      '{actor} نے {ledger} میں ایک ادائیگی اپ ڈیٹ کی۔',
    'settlement.deleted.body': '{actor} نے ایک ادائیگی حذف کی۔',
    'settlement.deleted.bodyWithLedger':
      '{actor} نے {ledger} میں ایک ادائیگی حذف کی۔',
    'group.invitation_sent.title': 'گروپ کی دعوت',
    'group.invitation_sent.body': '{actor} نے آپ کو {ledger} میں مدعو کیا ہے۔',
    'connection.created.title': 'کنکشن کی درخواست',
    'connection.created.body': '{actor} نے آپ کو کنکشن کی درخواست بھیجی ہے۔',
    'connection.accepted.title': 'کنکشن قبول ہو گیا',
    'connection.accepted.body':
      '{actor} نے آپ کی کنکشن کی درخواست قبول کر لی ہے۔',
    'reminder.created.title': '{actor} کی طرف سے حساب کی یاد دہانی',
    'reminder.created.body': '{ledger} میں آپ کا حساب ابھی باقی ہے۔',
    'reset.subject': 'اپنا Tally Stick پاس ورڈ ری سیٹ کریں',
    'reset.intro':
      'کسی نے آپ کے Tally Stick اکاؤنٹ کا پاس ورڈ ری سیٹ کرنے کی درخواست کی ہے۔',
    'reset.instructions':
      'نیا پاس ورڈ منتخب کرنے کے لیے یہ لنک اس فون پر کھولیں جس میں Tally Stick انسٹال ہے۔ یہ {minutes} منٹ میں ختم ہو جائے گا اور صرف ایک بار کام کرے گا۔',
    'reset.ignore':
      'اگر آپ نے یہ درخواست نہیں کی تو اس ای میل کو نظر انداز کریں۔ آپ کا پاس ورڈ تبدیل نہیں ہوگا۔',
  },
  ar: {
    someone: 'شخص ما',
    group: 'مجموعة',
    ledger: 'هذا الحساب',
    directLedger: 'حسابك المشترك',
    'expense.created.title': 'تمت إضافة مصروف',
    'expense.replaced.title': 'تم تحديث مصروف',
    'expense.deleted.title': 'تم حذف مصروف',
    'settlement.created.title': 'تمت إضافة تسوية',
    'settlement.replaced.title': 'تم تحديث تسوية',
    'settlement.deleted.title': 'تم حذف تسوية',
    'expense.created.body': 'أضاف {actor} مصروفًا.',
    'expense.created.bodyWithLedger': 'أضاف {actor} مصروفًا في {ledger}.',
    'expense.replaced.body': 'حدّث {actor} مصروفًا.',
    'expense.replaced.bodyWithLedger': 'حدّث {actor} مصروفًا في {ledger}.',
    'expense.deleted.body': 'حذف {actor} مصروفًا.',
    'expense.deleted.bodyWithLedger': 'حذف {actor} مصروفًا في {ledger}.',
    'settlement.created.body': 'أضاف {actor} تسوية.',
    'settlement.created.bodyWithLedger': 'أضاف {actor} تسوية في {ledger}.',
    'settlement.replaced.body': 'حدّث {actor} تسوية.',
    'settlement.replaced.bodyWithLedger': 'حدّث {actor} تسوية في {ledger}.',
    'settlement.deleted.body': 'حذف {actor} تسوية.',
    'settlement.deleted.bodyWithLedger': 'حذف {actor} تسوية في {ledger}.',
    'group.invitation_sent.title': 'دعوة إلى مجموعة',
    'group.invitation_sent.body': 'دعاك {actor} إلى {ledger}.',
    'connection.created.title': 'طلب تواصل',
    'connection.created.body': 'أرسل إليك {actor} طلب تواصل.',
    'connection.accepted.title': 'تم قبول التواصل',
    'connection.accepted.body': 'قبل {actor} طلب التواصل الخاص بك.',
    'reminder.created.title': 'تذكير بالرصيد من {actor}',
    'reminder.created.body': 'لديك رصيد غير مسوّى في {ledger}.',
    'reset.subject': 'إعادة تعيين كلمة مرور Tally Stick',
    'reset.intro': 'طلب شخص ما إعادة تعيين كلمة مرور حسابك في Tally Stick.',
    'reset.instructions':
      'افتح هذا الرابط على الهاتف المثبّت عليه Tally Stick لاختيار كلمة مرور جديدة. تنتهي صلاحيته خلال {minutes} دقيقة ويُستخدم مرة واحدة.',
    'reset.ignore': 'إذا لم تطلب ذلك، فتجاهل هذه الرسالة. لن تتغير كلمة مرورك.',
  },
  es: {
    someone: 'Alguien',
    group: 'un grupo',
    ledger: 'este registro',
    directLedger: 'tu saldo compartido',
    'expense.created.title': 'Gasto añadido',
    'expense.replaced.title': 'Gasto actualizado',
    'expense.deleted.title': 'Gasto eliminado',
    'settlement.created.title': 'Liquidación añadida',
    'settlement.replaced.title': 'Liquidación actualizada',
    'settlement.deleted.title': 'Liquidación eliminada',
    'expense.created.body': '{actor} añadió un gasto.',
    'expense.created.bodyWithLedger': '{actor} añadió un gasto en {ledger}.',
    'expense.replaced.body': '{actor} actualizó un gasto.',
    'expense.replaced.bodyWithLedger':
      '{actor} actualizó un gasto en {ledger}.',
    'expense.deleted.body': '{actor} eliminó un gasto.',
    'expense.deleted.bodyWithLedger': '{actor} eliminó un gasto en {ledger}.',
    'settlement.created.body': '{actor} añadió una liquidación.',
    'settlement.created.bodyWithLedger':
      '{actor} añadió una liquidación en {ledger}.',
    'settlement.replaced.body': '{actor} actualizó una liquidación.',
    'settlement.replaced.bodyWithLedger':
      '{actor} actualizó una liquidación en {ledger}.',
    'settlement.deleted.body': '{actor} eliminó una liquidación.',
    'settlement.deleted.bodyWithLedger':
      '{actor} eliminó una liquidación en {ledger}.',
    'group.invitation_sent.title': 'Invitación a un grupo',
    'group.invitation_sent.body': '{actor} te invitó a {ledger}.',
    'connection.created.title': 'Solicitud de conexión',
    'connection.created.body': '{actor} te envió una solicitud de conexión.',
    'connection.accepted.title': 'Conexión aceptada',
    'connection.accepted.body': '{actor} aceptó tu solicitud de conexión.',
    'reminder.created.title': 'Recordatorio de saldo de {actor}',
    'reminder.created.body': 'Tienes un saldo pendiente en {ledger}.',
    'reset.subject': 'Restablece tu contraseña de Tally Stick',
    'reset.intro':
      'Alguien solicitó restablecer la contraseña de tu cuenta de Tally Stick.',
    'reset.instructions':
      'Abre este enlace en el teléfono donde tienes instalado Tally Stick para elegir una nueva contraseña. Caduca en {minutes} minutos y solo se puede usar una vez.',
    'reset.ignore':
      'Si no lo solicitaste, ignora este correo. Tu contraseña no cambiará.',
  },
  fr: {
    someone: 'Quelqu’un',
    group: 'un groupe',
    ledger: 'ce compte',
    directLedger: 'votre solde partagé',
    'expense.created.title': 'Dépense ajoutée',
    'expense.replaced.title': 'Dépense modifiée',
    'expense.deleted.title': 'Dépense supprimée',
    'settlement.created.title': 'Règlement ajouté',
    'settlement.replaced.title': 'Règlement modifié',
    'settlement.deleted.title': 'Règlement supprimé',
    'expense.created.body': '{actor} a ajouté une dépense.',
    'expense.created.bodyWithLedger':
      '{actor} a ajouté une dépense dans {ledger}.',
    'expense.replaced.body': '{actor} a modifié une dépense.',
    'expense.replaced.bodyWithLedger':
      '{actor} a modifié une dépense dans {ledger}.',
    'expense.deleted.body': '{actor} a supprimé une dépense.',
    'expense.deleted.bodyWithLedger':
      '{actor} a supprimé une dépense dans {ledger}.',
    'settlement.created.body': '{actor} a ajouté un règlement.',
    'settlement.created.bodyWithLedger':
      '{actor} a ajouté un règlement dans {ledger}.',
    'settlement.replaced.body': '{actor} a modifié un règlement.',
    'settlement.replaced.bodyWithLedger':
      '{actor} a modifié un règlement dans {ledger}.',
    'settlement.deleted.body': '{actor} a supprimé un règlement.',
    'settlement.deleted.bodyWithLedger':
      '{actor} a supprimé un règlement dans {ledger}.',
    'group.invitation_sent.title': 'Invitation à un groupe',
    'group.invitation_sent.body': '{actor} vous a invité à rejoindre {ledger}.',
    'connection.created.title': 'Demande de connexion',
    'connection.created.body':
      '{actor} vous a envoyé une demande de connexion.',
    'connection.accepted.title': 'Connexion acceptée',
    'connection.accepted.body': '{actor} a accepté votre demande de connexion.',
    'reminder.created.title': 'Rappel de solde de {actor}',
    'reminder.created.body': 'Vous avez un solde à régler dans {ledger}.',
    'reset.subject': 'Réinitialisez votre mot de passe Tally Stick',
    'reset.intro':
      'Quelqu’un a demandé la réinitialisation du mot de passe de votre compte Tally Stick.',
    'reset.instructions':
      'Ouvrez ce lien sur le téléphone où Tally Stick est installé pour choisir un nouveau mot de passe. Il expire dans {minutes} minutes et ne fonctionne qu’une fois.',
    'reset.ignore':
      'Si vous n’avez pas fait cette demande, ignorez cet e-mail. Votre mot de passe ne changera pas.',
  },
  hi: {
    someone: 'किसी व्यक्ति',
    group: 'एक ग्रुप',
    ledger: 'इस खाते',
    directLedger: 'आपके साझा खाते',
    'expense.created.title': 'खर्च जोड़ा गया',
    'expense.replaced.title': 'खर्च अपडेट हुआ',
    'expense.deleted.title': 'खर्च हटाया गया',
    'settlement.created.title': 'भुगतान जोड़ा गया',
    'settlement.replaced.title': 'भुगतान अपडेट हुआ',
    'settlement.deleted.title': 'भुगतान हटाया गया',
    'expense.created.body': '{actor} ने एक खर्च जोड़ा।',
    'expense.created.bodyWithLedger': '{actor} ने {ledger} में एक खर्च जोड़ा।',
    'expense.replaced.body': '{actor} ने एक खर्च अपडेट किया।',
    'expense.replaced.bodyWithLedger':
      '{actor} ने {ledger} में एक खर्च अपडेट किया।',
    'expense.deleted.body': '{actor} ने एक खर्च हटाया।',
    'expense.deleted.bodyWithLedger': '{actor} ने {ledger} में एक खर्च हटाया।',
    'settlement.created.body': '{actor} ने एक भुगतान जोड़ा।',
    'settlement.created.bodyWithLedger':
      '{actor} ने {ledger} में एक भुगतान जोड़ा।',
    'settlement.replaced.body': '{actor} ने एक भुगतान अपडेट किया।',
    'settlement.replaced.bodyWithLedger':
      '{actor} ने {ledger} में एक भुगतान अपडेट किया।',
    'settlement.deleted.body': '{actor} ने एक भुगतान हटाया।',
    'settlement.deleted.bodyWithLedger':
      '{actor} ने {ledger} में एक भुगतान हटाया।',
    'group.invitation_sent.title': 'ग्रुप का निमंत्रण',
    'group.invitation_sent.body':
      '{actor} ने आपको {ledger} में आमंत्रित किया है।',
    'connection.created.title': 'कनेक्शन अनुरोध',
    'connection.created.body': '{actor} ने आपको कनेक्शन अनुरोध भेजा है।',
    'connection.accepted.title': 'कनेक्शन स्वीकार हुआ',
    'connection.accepted.body':
      '{actor} ने आपका कनेक्शन अनुरोध स्वीकार कर लिया है।',
    'reminder.created.title': '{actor} की ओर से बकाया याद दिलाना',
    'reminder.created.body': '{ledger} में आपका हिसाब अभी बाकी है।',
    'reset.subject': 'अपना Tally Stick पासवर्ड रीसेट करें',
    'reset.intro':
      'किसी ने आपके Tally Stick खाते का पासवर्ड रीसेट करने का अनुरोध किया है।',
    'reset.instructions':
      'नया पासवर्ड चुनने के लिए यह लिंक उस फ़ोन पर खोलें जहाँ Tally Stick इंस्टॉल है। यह {minutes} मिनट में समाप्त हो जाएगा और केवल एक बार काम करेगा।',
    'reset.ignore':
      'अगर आपने यह अनुरोध नहीं किया है, तो इस ईमेल को अनदेखा करें। आपका पासवर्ड नहीं बदलेगा।',
  },
  'zh-Hans': {
    someone: '有人',
    group: '一个群组',
    ledger: '此账本',
    directLedger: '你的共享账本',
    'expense.created.title': '已添加支出',
    'expense.replaced.title': '已更新支出',
    'expense.deleted.title': '已删除支出',
    'settlement.created.title': '已添加结算',
    'settlement.replaced.title': '已更新结算',
    'settlement.deleted.title': '已删除结算',
    'expense.created.body': '{actor}添加了一笔支出。',
    'expense.created.bodyWithLedger': '{actor}在{ledger}中添加了一笔支出。',
    'expense.replaced.body': '{actor}更新了一笔支出。',
    'expense.replaced.bodyWithLedger': '{actor}在{ledger}中更新了一笔支出。',
    'expense.deleted.body': '{actor}删除了一笔支出。',
    'expense.deleted.bodyWithLedger': '{actor}在{ledger}中删除了一笔支出。',
    'settlement.created.body': '{actor}添加了一笔结算。',
    'settlement.created.bodyWithLedger': '{actor}在{ledger}中添加了一笔结算。',
    'settlement.replaced.body': '{actor}更新了一笔结算。',
    'settlement.replaced.bodyWithLedger': '{actor}在{ledger}中更新了一笔结算。',
    'settlement.deleted.body': '{actor}删除了一笔结算。',
    'settlement.deleted.bodyWithLedger': '{actor}在{ledger}中删除了一笔结算。',
    'group.invitation_sent.title': '群组邀请',
    'group.invitation_sent.body': '{actor}邀请你加入{ledger}。',
    'connection.created.title': '好友请求',
    'connection.created.body': '{actor}向你发送了好友请求。',
    'connection.accepted.title': '好友请求已接受',
    'connection.accepted.body': '{actor}接受了你的好友请求。',
    'reminder.created.title': '来自{actor}的余额提醒',
    'reminder.created.body': '你在{ledger}中有未结清的余额。',
    'reset.subject': '重置你的Tally Stick密码',
    'reset.intro': '有人请求重置你的Tally Stick账户密码。',
    'reset.instructions':
      '请在安装了Tally Stick的手机上打开此链接，设置新密码。链接将在{minutes}分钟后失效，且只能使用一次。',
    'reset.ignore': '如果你没有提出此请求，请忽略此邮件。你的密码不会改变。',
  },
};

export function copy(
  locale: unknown,
  key: CopyKey,
  params: Record<string, string> = {},
): string {
  return translations[resolveLocale(locale)][key].replace(
    /\{(\w+)\}/g,
    (placeholder: string, name: string) => params[name] ?? placeholder,
  );
}

export function renderNotificationCopy(locale: unknown, value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const spec = value as NotificationCopy;
  if (
    !Object.hasOwn(en, spec.title) ||
    !Object.hasOwn(en, spec.body) ||
    (spec.actorName !== null && typeof spec.actorName !== 'string') ||
    (spec.ledgerName !== null && typeof spec.ledgerName !== 'string') ||
    !['ledger', 'directLedger', 'group'].includes(spec.ledgerFallback)
  )
    return null;
  const params = {
    actor: spec.actorName ?? copy(locale, 'someone'),
    ledger: spec.ledgerName ?? copy(locale, spec.ledgerFallback),
  };
  return {
    title: copy(locale, spec.title, params),
    body: copy(locale, spec.body, params),
  };
}
