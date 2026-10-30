import { RenewalTip } from '../types';

export const renewalGuides: RenewalTip[] = [
  {
    category: 'permesso_soggiorno',
    titleAr: 'تجديد تصريح الإقامة (Permesso di Soggiorno)',
    titleIt: 'Rinnovo del Permesso di Soggiorno',
    stepsAr: [
      'احصل على المظروف الأصفر (Kit Postale) مجاناً من أي مكتب بريد إيطالي يحمل شارة Sportello Amico.',
      'املأ النموذج الأول (Modulo 1)، وإذا كان لديك دخل أو عمل املأ أيضاً النموذج الثاني (Modulo 2).',
      'أرفق طابع دمغة (Marca da Bollo) بقيمة 16 يورو تشتريه من الـ Tabacchi.',
      'أرفق نسخاً من: جواز السفر كاملاً، تصريح الإقامة الحالي، الكود المالي (Codice Fiscale)، وعقد العمل / كشوف المرتبات (Buste Paga).',
      'سلّم المظروف في مكتب البريد وادفع رسوم الإقامة والبريد (حوالي 100-130 يورو حسب المدة).',
      'احتفظ بإيصال البريد (Ricevuta Postale) الذي يحتوي على كود المتابعة (User & Password) للتحقق من حالة الطلب على موقع Polizia di Stato.'
    ],
    stepsIt: [
      'Ritira gratuitamente la busta con striscia gialla (Kit Postale) presso qualsiasi ufficio postale con "Sportello Amico".',
      'Compila il Modulo 1 e, se possiedi redditi da lavoro o autonomo, anche il Modulo 2.',
      'Acquista una Marca da Bollo da 16,00 € presso una tabaccheria e applicala sul modulo.',
      'Allega fotocopie di: passaporto (tutte le pagine), permesso attuale, codice fiscale, contratto di lavoro e ultime buste paga (o CUD).',
      'Spedisci il kit allo Sportello Amico, pagando il bollettino per il titolo di soggiorno elettronico e la raccomandata postale.',
      'Conserva con cura la ricevuta postale (Assicurata): costituisce documento provvisorio valido e contiene credenziali per tracciare la pratica su portaleimmigrazione.it e poliziadistato.it.'
    ],
    importantNoticeAr: 'تنبيه قانوني: يجب تقديم طلب التجديد خلال 60 يوماً قبل تاريخ الانتهاء (أو في موعد أقصاه 60 يوماً بعد الانتهاء وفقاً للمادة 5 من قانون الهجرة Testo Unico Immigrazione).',
    importantNoticeIt: 'Avviso legale: La domanda di rinnovo va presentata entro 60 giorni prima della scadenza (o massimo 60 giorni dopo ai sensi dell\'art. 5 del D.Lgs. 286/98).',
    links: [
      { label: 'Portale Immigrazione (تتبع المعاملة)', url: 'https://www.portaleimmigrazione.it' },
      { label: 'Polizia di Stato (فحص جاهزية الإقامة)', url: 'https://questure.poliziadistato.it/stranieri/' }
    ]
  },
  {
    category: 'carta_identita',
    titleAr: 'تجديد بطاقة الهوية الإلكترونية (CIE)',
    titleIt: 'Rinnovo della Carta d\'Identità Elettronica (CIE)',
    stepsAr: [
      'احجز موعداً في بلدية إقامتك (Comune) عبر البوابة الرسمية: Prenotazioni CIE (prenotazionicie.interno.gov.it).',
      'أحضر صورة شمسية حديثة (Fototessera) بخلفية بيضاء مطابقة للمواصفات الدولية.',
      'أحضر بطاقة الهوية القديمة (أو محضر الفقدان Denuncia في حال الضياع).',
      'أحضر الكود المالي (Codice Fiscale) أو البطاقة الصحية.',
      'سداد الرسوم البلدية (حوالي 22.20 يورو).',
      'تصلك البطاقة بالبريد المسجل إلى عنوان منزلك خلال 6 أيام عمل.'
    ],
    stepsIt: [
      'Prenota l\'appuntamento presso il tuo Comune tramite la piattaforma del Ministero dell\'Interno (prenotazionicie.interno.gov.it).',
      'Porta una fototessera recente su sfondo chiaro (massimo 6 mesi).',
      'Porta la carta d\'identità scaduta o deteriorata (oppure denuncia dei Carabinieri in caso di smarrimento).',
      'Porta il codice fiscale o tessera sanitaria.',
      'Paga il costo di emissione (generalmente 22,20 €).',
      'La CIE verrà spedita direttamente al tuo indirizzo entro 6 giorni lavorativi.'
    ],
    importantNoticeAr: 'ملاحظة: يمكنك تجديد بطاقة الهوية بدءاً من 180 يوماً (6 أشهر) قبل تاريخ انتهاء صلاحيتها.',
    importantNoticeIt: 'Nota: Il rinnovo della CIE può essere richiesto a partire da 180 giorni prima della scadenza.',
    links: [
      { label: 'Prenotazioni CIE (حجز موعد الهوية)', url: 'https://www.prenotazionicie.interno.gov.it' }
    ]
  },
  {
    category: 'patente',
    titleAr: 'تجديد رخصة القيادة الإيطالية (Patente di Guida)',
    titleIt: 'Rinnovo della Patente di Guida',
    stepsAr: [
      'قم بإجراء الفحص الطبي لدى طبيب معتمد (في مقر الـ ASL أو مدارس تعليم القيادة Autoscuola أو مراكز ACI).',
      'دفع الرسوم عبر PagoPA (حوالي 16.00 يورو ضريبة دمغة + 10.20 يورو حقوق Motorizzazione).',
      'إحضار صورة شخصية حديثة ورخصة القيادة القديمة.',
      'يسلمك الطبيب إيصالاً مؤقتاً للقيادة صالح لمدة 60 يوماً حتى استلام الرخصة الجديدة.',
      'تصلك رخصة القيادة الجديدة عبر البريد المؤمن إلى عنوانك مع دفع رسوم التسليم (6.86 يورو).'
    ],
    stepsIt: [
      'Effettua la visita medica di idoneità presso un medico autorizzato (ASL, autoscuola o delegazione ACI).',
      'Effettua i pagamenti dei bollettini PagoPA (16,00 € imposta di bollo + 10,20 € diritti di motorizzazione).',
      'Presenta una fototessera recente e la patente in scadenza.',
      'Il medico rilascerà un certificato sostitutivo valido per guidare fino alla consegna del duplicato.',
      'La nuova patente plastificata viene recapitata tramite posta assicurata a casa.'
    ],
    importantNoticeAr: 'تحذير: القيادة برخصة منتهية يعاقب عليها القانون بغرامة مالية وسحب الرخصة فورياً.',
    importantNoticeIt: 'Avviso: Guidare con patente scaduta comporta una sanzione amministrativa e il ritiro immediato del documento.',
    links: [
      { label: 'Il Portale dell\'Automobilista (بوابة السائقين)', url: 'https://www.ilportaledellautomobilista.it' }
    ]
  },
  {
    category: 'tessera_sanitaria',
    titleAr: 'تجديد البطاقة الصحية (Tessera Sanitaria)',
    titleIt: 'Rinnovo della Tessera Sanitaria (TEAM)',
    stepsAr: [
      'للمواطنين الإيطاليين: يتم التجديد والإرسال تلقائياً من قبل وكالة الإيرادات (Agenzia delle Entrate) إلى العنوان المسجل.',
      'للمقيمين الأجانب: يرتبط تجديدها بصلاحية تصريح الإقامة (Permesso di Soggiorno).',
      'إذا قمت بتقديم طلب تجديد الإقامة، خذ إيصال البريد (Ricevuta) وتوجه إلى مكتب الـ ASL في منطقتك لتمديد التسجيل الصحي مؤقتاً والحصول على وثيقة بديلة.',
      'بمجرد استلام كارت الإقامة الجديد، قم بزيارة الـ ASL لتحديث الصلاحية لسنوات إضافية.'
    ],
    stepsIt: [
      'Per cittadini italiani ed equiparati: il rinnovo avviene in automatico e la tessera viene spedita dall\'Agenzia delle Entrate.',
      'Per cittadini stranieri: la validità della tessera segue quella del permesso di soggiorno.',
      'In fase di rinnovo del permesso: recarsi all\'ufficio ASL con la ricevuta postale del kit per ottenere l\'iscrizione provvisoria al SSN.',
      'Al ricevimento della nuova carta di soggiorno: aggiornare la posizione presso l\'ASL per l\'emissione definitiva.'
    ],
    importantNoticeAr: 'تنبيه: لا تدع التسجيل بالـ ASL ينقطع لتفادي فقدان طبيب العائلة (Medico di Base).',
    importantNoticeIt: 'Promemoria: Mantieni sempre attiva l\'iscrizione al SSN per non perdere l\'assegnazione del medico di base.',
    links: [
      { label: 'Agenzia delle Entrate - Tessera Sanitaria', url: 'https://www.agenziaentrate.gov.it' }
    ]
  },
  {
    category: 'assicurazione',
    titleAr: 'تجديد وثيقة تأمين السيارة (Assicurazione RCA)',
    titleIt: 'Rinnovo Assicurazione Auto / Veicoli (RCA)',
    stepsAr: [
      'لا يوجد تجديد تلقائي بعد إلغاء قانون التجديد الضمني (Tacito Rinnovo) في إيطاليا منذ 2013.',
      'يمنحك القانون فترة سماح (Periodo di tolleranza) لمدة 15 يوماً فقط بعد موعد الانتهاء تكون فيها التغطية سارية داخل إيطاليا.',
      'قارن عروض الشركات الأخرى للحصول على أفضل سعر قبل أسبوعين من الانتهاء.',
      'تحقق من شهادة السوابق التأمينية (Attestato di Rischio - ATR) المتاحة رقمياً عبر موقع شركتك الحالية.'
    ],
    stepsIt: [
      'In Italia vige l\'abolizione del tacito rinnovo per la RCA auto: la polizza non si rinnova automaticamente.',
      'È previsto un periodo di tolleranza legale di 15 giorni dopo la data di scadenza con copertura attiva.',
      'Confronta le offerte di mercato almeno 2-3 settimane prima per valutare condizioni più vantaggiose.',
      'Verifica il tuo Attestato di Rischio (ATR) elettronico nell\'area riservata della tua compagnia.'
    ],
    importantNoticeAr: 'تحذير: بعد انقضاء 15 يوماً من السماح، القيادة بدون تأمين تؤدي لحجز المركبة وغرامة باهظة تبدأ من 866 يورو.',
    importantNoticeIt: 'Attenzione: Circolare oltre i 15 giorni di tolleranza senza polizza attiva comporta il sequestro del mezzo e multe severe.',
    links: [
      { label: 'IVASS (معهد الرقابة على التأمين)', url: 'https://www.ivass.it' }
    ]
  }
];
