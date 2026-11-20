/*
 * Terms blocked from text that other users can see.
 *
 * English, Spanish, French, Arabic, Hindi (Roman) and Chinese entries are a
 * curated subset of "List of Dirty, Naughty, Obscene, and Otherwise Bad
 * Words" (https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words),
 * © Shutterstock and contributors, licensed CC BY 4.0
 * (https://creativecommons.org/licenses/by/4.0/). Changes: entries that are
 * ordinary words, names or mild language were removed, spelling variants were
 * added, and Roman Urdu, Urdu-script and Devanagari entries were written for
 * Tally Stick.
 *
 * Keep entries to slurs, explicit sexual terms and severe profanity. Before
 * adding one, check that it is not an ordinary word in another app language
 * after normalization (for example Urdu "کس" or "نیک"), then run
 * `pnpm check:content-filter`.
 *
 * WORDS match whole words; entries with spaces match as a phrase and also as
 * one run-together word. HAN entries match anywhere in the Han characters.
 */

// prettier-ignore
export const BLOCKED_WORDS: readonly string[] = [
  // English
  'fuck', 'fucks', 'fucker', 'fuckers', 'fucked', 'fucking', 'fuckin',
  'fuckoff', 'fuckface', 'fuckhead', 'fucktard', 'motherfucker',
  'motherfuckers', 'motherfucking', 'clusterfuck', 'shit', 'shits', 'shitty',
  'shithead', 'shithole', 'bullshit', 'horseshit', 'cunt', 'cunts', 'bitch',
  'bitches', 'whore', 'whores', 'slut', 'sluts', 'slutty', 'asshole',
  'assholes', 'arsehole', 'dickhead', 'pussy', 'pussies', 'cocksucker',
  'blowjob', 'blowjobs', 'blow job', 'handjob', 'rimjob', 'cumshot',
  'creampie', 'gangbang', 'dildo', 'porn', 'porno', 'pornography', 'jizz',
  'wank', 'wanker', 'wanking', 'twat', 'nigger', 'niggers', 'nigga', 'niggas',
  'faggot', 'faggots', 'retard', 'retarded', 'spic', 'kike', 'wetback',
  'beaner', 'coon', 'gook', 'raghead', 'towelhead', 'tranny', 'shemale',
  'rapist', 'pedophile', 'paedophile', 'bestiality', 'zoophilia',
  'masturbate', 'masturbating', 'masturbation', 'orgasm', 'orgy', 'threesome',
  'milf', 'hentai', 'bukkake', 'fellatio', 'cunnilingus', 'tits', 'titties',
  'boobs', 'horny', 'slanteye', 'jigaboo', 'darkie', 'honkey', 'pikey',
  'white power', 'neonazi',

  // Roman Urdu and Roman Hindi
  'behenchod', 'bhenchod', 'benchod', 'bhencho', 'behnchod', 'behen chod',
  'betichod', 'madarchod', 'maderchod', 'madar chod', 'mader chod',
  'bhosdi', 'bhosdike', 'bhosdiwala', 'bhosadi', 'bhosadike', 'bhosda',
  'bhosada', 'bhosri', 'bhosrike', 'teri maa ka bhosda', 'chutiya', 'chutiye',
  'chutia', 'chutiyapa', 'chootiya', 'chootia', 'chut ke baal', 'maa ki chut',
  'gaand', 'gaandu', 'gandu', 'gaandfat', 'gand mara', 'gaand mara',
  'gand maar', 'gaand maar', 'harami', 'haramzada', 'haramzade', 'haramzadi',
  'haraamzada', 'haraamzaade', 'haramkhor', 'kanjar', 'kanjari', 'kanjri',
  'randi', 'randwa', 'raand', 'randikhana', 'bhadwa', 'bhadwe', 'bhadva',
  'bhadve', 'bharwa', 'bharwe', 'bharva', 'chinaal', 'lund', 'lauda', 'lavda',
  'lawda', 'lavde', 'lawde', 'loda', 'lodu', 'lavdu', 'chodu',
  'chudai', 'jhant', 'jhantu', 'jhaant', 'phudi', 'phuddi', 'phudu', 'phuddu',
  'kuttiya', 'kutte ki aulad', 'gashti', 'gasti', 'ghasti', 'chinki',
  'bhangi', 'paki',

  // Spanish
  'cabrón', 'cabrones', 'chupapollas', 'coño', 'gilipollas', 'jilipollas',
  'hijo de puta', 'hija de puta', 'hijoputa', 'hijueputa', 'hijaputa', 'puta',
  'putas', 'puto', 'putos', 'pendejo', 'pendeja', 'pendejos', 'maricón',
  'maricones', 'mamada', 'follar', 'verga', 'mierda', 'joder', 'chinga',
  'chingada', 'chingado', 'chingar', 'chinga tu madre', 'concha de tu madre',
  'concha tu madre', 'vete a la mierda', 'soplapollas', 'culero', 'malparido',
  'malparida',

  // French
  'connard', 'connasse', 'enculé', 'enculée', 'enculer', 'enculeur',
  'enfoiré', 'enfoirée', 'fils de pute', 'fille de pute', 'nique ta mère',
  'nique ta race', 'niquer', 'putain', 'pute', 'salope', 'salopes',
  'branleur', 'branleuse', 'branlette', 'gouine', 'merde', 'trou du cul',
  'sac à merde', 'pouffiasse', 'bougnoule',

  // Arabic
  'كس امك', 'كسمك', 'طيز', 'زب', 'زبي', 'منيوك', 'منيوكة', 'متناك', 'متناكة',
  'شرموطة', 'شراميط', 'عرص', 'قحبة', 'قحاب', 'لوطي', 'سكس',

  // Urdu
  'حرامی', 'حرامزادہ', 'حرامزادے', 'حرامزادی', 'حرام زادہ', 'کنجر', 'کنجری',
  'رنڈی', 'چوتیا', 'چوتیے', 'بہن چود', 'بہنچود', 'مادر چود', 'مادرچود',
  'گانڈ', 'گانڈو', 'بھڑوا', 'بھڑوے', 'لوڑا', 'لوڑے', 'پھدی', 'پھدو',

  // Hindi (Devanagari)
  'चूतिया', 'चुतिया', 'चूतिये', 'मादरचोद', 'मादर चोद', 'बहनचोद', 'बहन चोद',
  'बेहनचोद', 'भेनचोद', 'भोसड़ी', 'भोसड़ीके', 'रंडी', 'गांड', 'गांडू', 'लौड़ा',
  'लौड़े', 'लवड़ा', 'लंड', 'हरामज़ादा', 'हरामजादे', 'हरामी', 'कुत्तिया',
  'चोदू', 'चुदाई', 'भड़वा', 'भड़वे', 'झांट',
];

// Simplified Chinese
// prettier-ignore
export const BLOCKED_HAN: readonly string[] = [
  '操你妈', '操你娘', '操你全家', '操你祖宗', '操你大爷', '干你娘', '干你妈',
  '去你妈的', '肏', '屄', '傻逼', '傻屄', '煞笔', '草泥马', '骚逼', '骚货',
  '贱人', '贱货', '婊子', '鸡巴', '王八蛋', '狗日的', '肛交', '轮奸', '淫荡',
  '荡妇',
];
