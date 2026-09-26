const T = (fr, en) => ({ fr, en });

export const TRUTHS = {
  amour: {
    doux: [
      T("Quel petit geste te fait te sentir aimé·e ?", "What small gesture makes you feel loved?"),
      T("Quelle chanson te rappelle quelqu'un de cher ?", "Which song reminds you of someone dear?"),
      T("Quel est le compliment que tu gardes encore ?", "Which compliment do you still keep?"),
      T("Décris un rendez-vous simple qui t'a rendu heureux·se.", "Describe a simple date that made you happy."),
      T("Quelle qualité cherches-tu en premier chez quelqu'un ?", "What quality do you look for first in someone?"),
      T("Quel mot doux aimerais-tu entendre plus souvent ?", "Which tender word would you like to hear more often?"),
    ],
    malin: [
      T("As-tu déjà relu une conversation en souriant ?", "Have you ever reread a conversation while smiling?"),
      T("Quel est ton red flag le plus assumé, dit gentiment ?", "What is your most owned red flag, said kindly?"),
      T("Tu écris d'abord, ou tu attends ?", "Do you text first, or do you wait?"),
      T("Quelle série t'a donné une idée d'amour irréaliste ?", "Which series gave you an unrealistic idea of love?"),
      T("Avoue un crush de fiction, sans te justifier.", "Admit a fictional crush, no justification."),
      T("Qu'est-ce qui te fait rougir plus vite qu'un message ?", "What makes you blush faster than a text?"),
    ],
    intense: [
      T("Quelle vérité sur toi tu n'as dite qu'à une personne ?", "What truth about you have you told only one person?"),
      T("Décris ton baiser idéal sans le mimer.", "Describe your ideal kiss without acting it."),
      T("Qu'est-ce que tu n'oses pas demander, alors que tu en as envie ?", "What do you want but don't dare ask for?"),
      T("Quel prénom as-tu cherché récemment, et pourquoi ?", "Which name did you look up recently, and why?"),
      T("Si tu envoyais une lettre ce soir, à qui serait-elle ?", "If you sent a letter tonight, who would it be to?"),
      T("Quelle peur amoureuse tu peux nommer sans te juger ?", "Which fear about love can you name without judging yourself?"),
    ],
  },
  amitie: {
    doux: [
      T("Qui t'a déjà défendu·e sans qu'on te le demande ?", "Who has stood up for you without being asked?"),
      T("Quel souvenir d'ami·e te fait rire tout seul·e ?", "Which friend memory makes you laugh alone?"),
      T("Comment montres-tu que tu es là, sans grands discours ?", "How do you show you're there, without a speech?"),
      T("Quelle habitude d'ami·e tu adores en secret ?", "Which friend habit do you secretly love?"),
      T("À qui enverrais-tu un message juste pour dire merci ?", "Who would you text just to say thank you?"),
      T("Quel endroit te rappelle une amitié précise ?", "Which place reminds you of a specific friendship?"),
    ],
    malin: [
      T("As-tu déjà gardé un secret un peu trop lourd ?", "Have you ever kept a secret that was a bit heavy?"),
      T("Quel ami·e te connaît trop bien ?", "Which friend knows you too well?"),
      T("Tu préfères la vérité directe ou le silence poli ?", "Do you prefer direct truth or polite silence?"),
      T("Quelle dispute d'amis t'a finalement rapproché·e ?", "Which friend fight ended up bringing you closer?"),
      T("Avoue une manie que tes ami·es imitent.", "Admit a habit your friends imitate."),
      T("Qui dans ta vie mérite un surnom plus doux ?", "Who in your life deserves a softer nickname?"),
    ],
    intense: [
      T("Quelle amitié as-tu laissée s'éloigner, et qu'en penses-tu ?", "Which friendship did you let drift, and what do you think now?"),
      T("De quoi aurais-tu besoin pour faire plus confiance ?", "What would you need in order to trust more?"),
      T("Quel merci n'as-tu jamais dit à voix haute ?", "Which thank-you have you never said out loud?"),
      T("Quand as-tu été un·e bon·ne ami·e, concrètement ?", "When were you a good friend, concretely?"),
      T("Quelle limite tu veux que tes ami·es respectent ?", "Which boundary do you want your friends to respect?"),
      T("Si le salon ne devait retenir qu'une chose de toi, laquelle ?", "If the room remembered one thing about you, what would it be?"),
    ],
  },
  fun: {
    doux: [
      T("Quel est ton snack de bonheur immédiat ?", "What is your instant-happiness snack?"),
      T("Quelle danse fais-tu quand personne ne regarde ?", "What dance do you do when nobody is watching?"),
      T("Quel emoji te ressemble le plus aujourd'hui ?", "Which emoji looks most like you today?"),
      T("Avoue une chanson que tu connais par cœur.", "Admit a song you know by heart."),
      T("Quel super-pouvoir inutile choisirais-tu ?", "Which useless superpower would you pick?"),
      T("Tu es plutôt matin calme ou nuit bavarde ?", "Are you a quiet morning or a talkative night?"),
    ],
    malin: [
      T("Quelle bêtise de jeunesse tu racontes encore ?", "Which youthful silliness do you still tell?"),
      T("As-tu déjà fait semblant de connaître une référence ?", "Have you ever pretended to know a reference?"),
      T("Quel est ton talent le plus inutile et le plus fier ?", "What is your most useless and proudest talent?"),
      T("Quelle application ouvres-tu sans réfléchir ?", "Which app do you open without thinking?"),
      T("Avoue un pseudo-name que tu as failli choisir.", "Admit a nickname you almost chose."),
      T("Si tu étais un plat de Lomé, lequel ?", "If you were a Lomé dish, which one?"),
    ],
    intense: [
      T("Quelle rumeur sur toi est fausse, et laquelle est presque vraie ?", "Which rumor about you is false, and which is almost true?"),
      T("Qu'est-ce que tu fais quand tu procrastines vraiment ?", "What do you do when you truly procrastinate?"),
      T("Avoue le dernier truc que tu as cherché sur internet.", "Admit the last thing you searched online."),
      T("Quel compliment te met le plus mal à l'aise, et pourquoi ?", "Which compliment makes you most uneasy, and why?"),
      T("Si le chaton pouvait parler, que dirait-il de toi ?", "If the kitten could talk, what would it say about you?"),
      T("Quelle règle de la maison tu enfreins en souriant ?", "Which house rule do you break while smiling?"),
    ],
  },
  audace: {
    doux: [
      T("Dis un compliment précis à quelqu'un dans la pièce.", "Give a precise compliment to someone in the room."),
      T("Quelle audace toute petite as-tu eue cette semaine ?", "What tiny bit of boldness did you have this week?"),
      T("Qui aimerais-tu remercier devant les autres ?", "Who would you like to thank in front of the others?"),
      T("Quel rêve tu oses dire à voix haute aujourd'hui ?", "Which dream do you dare say out loud today?"),
      T("Avoue une chose que tu aimes et que peu de gens savent.", "Admit something you love that few people know."),
      T("Quel « non » bienveillant tu as déjà réussi à dire ?", "Which kind 'no' have you already managed to say?"),
    ],
    malin: [
      T("Quel message tu as écrit puis effacé ?", "Which message did you write and then delete?"),
      T("Avoue un goût musical que le salon ne devinerait pas.", "Admit a music taste the room would not guess."),
      T("Quelle mode as-tu suivie, puis regrettée en riant ?", "Which trend did you follow, then laugh about?"),
      T("Si tu devais inviter quelqu'un ce soir, qui ?", "If you had to invite someone tonight, who?"),
      T("Quel surnom te va trop bien ?", "Which nickname suits you too well?"),
      T("Avoue une victoire minuscule dont tu es fier·ère.", "Admit a tiny victory you are proud of."),
    ],
    intense: [
      T("Regarde quelqu'un et dis ce que tu respectes chez elle ou lui.", "Look at someone and say what you respect in them."),
      T("Quelle vérité tu peux offrir sans demander de réponse ?", "Which truth can you offer without asking for a reply?"),
      T("Décris en vingt secondes la personne que tu veux devenir.", "In twenty seconds, describe the person you want to become."),
      T("Quel risque doux tu n'as pas encore pris ?", "Which gentle risk have you not taken yet?"),
      T("Avoue une jalousie légère, sans accuser personne.", "Admit a light jealousy, without accusing anyone."),
      T("Si tu avais une minute de courage, tu ferais quoi ?", "If you had one minute of courage, what would you do?"),
    ],
  },
};

export const DARES = {
  amour: {
    doux: [
      T("Fais un cœur avec tes mains et garde-le cinq secondes.", "Make a heart with your hands and hold it for five seconds."),
      T("Dis un compliment sincère à la personne à ta gauche.", "Give a sincere compliment to the person on your left."),
      T("Invente un surnom tendre pour le chaton.", "Invent a tender nickname for the kitten."),
      T("Décris ton rendez-vous idéal en une seule phrase.", "Describe your ideal date in a single sentence."),
      T("Envoie un emoji cœur à quelqu'un qui compte, si tu veux.", "Send a heart emoji to someone who matters, if you want."),
      T("Choisis une chanson-thème pour la personne de ton choix.", "Pick a theme song for a person you choose."),
    ],
    malin: [
      T("Raconte une anecdote romantique en voix de documentaire.", "Tell a romantic anecdote in a documentary voice."),
      T("Écris un haïku de trois lignes sur le mot « presque ».", "Write a three-line haiku on the word 'almost'."),
      T("Mime une scène de film romantique, sans contact.", "Mime a romantic movie scene, no contact."),
      T("Donne trois qualités à quelqu'un, dont une inattendue.", "Give someone three qualities, one of them unexpected."),
      T("Chante deux mesures d'une chanson d'amour, même faux.", "Sing two bars of a love song, even off-key."),
      T("Fais deviner un mot amoureux sans le dire.", "Make others guess a loving word without saying it."),
    ],
    intense: [
      T("Dis, en te regardant dans un reflet, une chose dont tu es fier·ère.", "Looking at your reflection, say one thing you are proud of."),
      T("Écris une phrase que tu n'as jamais osé envoyer, puis décide si tu la gardes.", "Write a sentence you never dared send, then decide whether to keep it."),
      T("Tiens le regard de quelqu'un dix secondes, sourire autorisé.", "Hold someone's gaze for ten seconds. Smiling is allowed."),
      T("Fais un toast de vingt secondes pour une personne du salon.", "Give a twenty-second toast for someone in the room."),
      T("Avoue un désir simple pour les sept prochains jours.", "Admit a simple wish for the next seven days."),
      T("Inventez à deux une règle de tendresse pour la soirée.", "Together, invent one rule of tenderness for the evening."),
    ],
  },
  amitie: {
    doux: [
      T("Tape dans la main de chaque joueur, ou fais un signe si tu préfères.", "High-five each player, or wave if you prefer."),
      T("Donne un surnom d'équipe au salon.", "Give the room a team nickname."),
      T("Raconte une blague très courte. Les gémissements comptent comme des rires.", "Tell a very short joke. Groans count as laughs."),
      T("Dessine le blason de votre amitié en dix secondes.", "Draw your friendship crest in ten seconds."),
      T("Dis merci à quelqu'un pour une chose précise.", "Thank someone for something specific."),
      T("Imite gentiment la façon de rire d'un ami, avec son accord.", "Gently imitate a friend's laugh, with their consent."),
    ],
    malin: [
      T("Fais deviner un ami commun en trois indices.", "Get others to guess a mutual friend in three clues."),
      T("Échange ton pseudo-name avec quelqu'un pour une manche.", "Swap nicknames with someone for one round."),
      T("Raconte une anecdote en exactement vingt mots.", "Tell a story in exactly twenty words."),
      T("Donne un gage tout doux à la personne de ton choix.", "Give a very soft dare to a person you choose."),
      T("Fais l'éloge d'une manie agaçante, comme si c'était un talent.", "Praise an annoying habit as if it were a talent."),
      T("Choisis une devise d'amitié et crie-la à mi-voix.", "Pick a friendship motto and say it at half volume."),
    ],
    intense: [
      T("Dis une vérité utile à un ami, avec douceur.", "Tell a friend a useful truth, gently."),
      T("Promets une petite attention réelle dans les 48 heures.", "Promise a small real kindness within 48 hours."),
      T("Raconte un moment où tu as été sauvé·e par une amitié.", "Tell about a time a friendship saved you."),
      T("Laisse le salon te donner un conseil, et remercie sans débattre.", "Let the room give you advice, and thank them without debating."),
      T("Écris le nom de quelqu'un et une raison de l'appeler demain.", "Write someone's name and a reason to call them tomorrow."),
      T("Fais un serment d'ami·e en une phrase, la main sur le cœur.", "Make a one-sentence friend vow, hand on heart."),
    ],
  },
  fun: {
    doux: [
      T("Fais trois pas de danse assis·e.", "Do three dance steps while seated."),
      T("Parle comme le chaton pendant une phrase.", "Talk like the kitten for one sentence."),
      T("Choisis un nouveau nom de salon pour cette manche.", "Pick a new room name for this round."),
      T("Mime ton emoji préféré.", "Mime your favorite emoji."),
      T("Compte jusqu'à cinq avec un accent inventé, jamais moqueur.", "Count to five in an invented accent, never mocking."),
      T("Fais applaudir le salon en moins de dix secondes.", "Get the room to clap in under ten seconds."),
    ],
    malin: [
      T("Raconte ta journée comme une bande-annonce.", "Tell your day like a movie trailer."),
      T("Tiens un objet en l'air et vends-le comme un trésor.", "Hold an object up and sell it like a treasure."),
      T("Fais rire quelqu'un sans parler.", "Make someone laugh without speaking."),
      T("Invente une pub de cinq secondes pour l'amitié.", "Invent a five-second ad for friendship."),
      T("Marche au ralenti jusqu'à l'autre bout de la pièce, si tu peux.", "Walk in slow motion across the room, if you can."),
      T("Dis l'alphabet à l'envers jusqu'à la lettre T.", "Say the alphabet backwards down to T."),
    ],
    intense: [
      T("Improvises un discours de remise de prix pour la personne à ta droite.", "Improvise an award speech for the person on your right."),
      T("Chante le prénom de quelqu'un sur un air connu.", "Sing someone's name to a known tune."),
      T("Fais une déclaration d'amour à ton plat préféré.", "Declare your love to your favorite dish."),
      T("Tiens une minute en commentant la pièce comme un match.", "Commentate the room like a sports match for one minute, or twenty seconds if you pass."),
      T("Invente une danse de la victoire et apprends-la à quelqu'un.", "Invent a victory dance and teach it to someone."),
      T("Fais une révérence spectaculaire au salon.", "Give the room a spectacular bow."),
    ],
  },
  audace: {
    doux: [
      T("Demande un compliment, et accepte-le sans te défiler.", "Ask for a compliment, and accept it without dodging."),
      T("Dis « je suis capable » à voix claire.", "Say 'I am capable' in a clear voice."),
      T("Propose une idée de sortie que tu n'as jamais osée.", "Suggest an outing you have never dared."),
      T("Choisis quelqu'un et dis ce que tu aimes dans sa façon d'être.", "Pick someone and say what you like about how they are."),
      T("Change de place avec un joueur pour la prochaine manche.", "Swap seats with a player for the next round."),
      T("Annonce un mini-défi que tu feras demain matin.", "Announce a mini challenge you will do tomorrow morning."),
    ],
    malin: [
      T("Laisse le salon choisir ton prochain gage parmi deux options douces.", "Let the room pick your next dare from two gentle options."),
      T("Fais un compliment à toi-même sans ironie.", "Compliment yourself with no irony."),
      T("Raconte une peur toute petite et transforme-la en gage rigolo.", "Tell a tiny fear and turn it into a silly dare."),
      T("Demande à quelqu'un son conseil le plus utile.", "Ask someone for their most useful advice."),
      T("Écris un mot audacieux sur un papier et montre-le.", "Write a bold word on paper and show it."),
      T("Fais deviner ton talent caché en mime.", "Mime your hidden talent for others to guess."),
    ],
    intense: [
      T("Dis une chose que tu veux apprendre, et qui t'impressionne.", "Name something you want to learn that impresses you."),
      T("Regarde le salon et dis pourquoi tu es content·e d'être là.", "Look at the room and say why you are glad to be here."),
      T("Accepte un gage choisi par les autres, dans la liste douce seulement.", "Accept a dare chosen by the others, from the gentle list only."),
      T("Fais une promesse publique toute petite, datée.", "Make a tiny public promise, with a date."),
      T("Donne la parole à quelqu'un qui a peu parlé, avec bienveillance.", "Give the floor to someone who has spoken little, kindly."),
      T("Termine par un toast : à l'amour, à l'amitié, ou aux deux.", "End with a toast: to love, to friendship, or to both."),
    ],
  },
};

export const WHO = [
  T("envoyer un message à deux heures du matin", "text someone at two in the morning"),
  T("pleurer devant un film et le nier", "cry at a film and deny it"),
  T("organiser une surprise jusqu'au bout", "plan a surprise all the way through"),
  T("garder un secret même sous la torture des regards", "keep a secret even under the torture of glances"),
  T("danser sans musique", "dance with no music"),
  T("oublier un anniversaire puis se rattraper en grand", "forget a birthday and then make up for it grandly"),
  T("tomber amoureux·se en premier", "fall in love first"),
  T("défendre un ami en public", "defend a friend in public"),
  T("lancer la prochaine soirée jeux", "start the next game night"),
  T("adopter le chaton officiellement", "officially adopt the kitten"),
  T("écrire une lettre plutôt qu'un message", "write a letter instead of a text"),
  T("arriver avec un plat en trop", "show up with too much food"),
  T("faire rire tout le salon en dix secondes", "make the whole room laugh in ten seconds"),
  T("proposer un gage encore plus doux", "suggest an even gentler dare"),
  T("garder le score sans tricher", "keep score without cheating"),
  T("dire la vérité la plus tendre", "tell the tenderest truth"),
  T("transformer une dispute en blague", "turn an argument into a joke"),
  T("inviter quelqu'un de nouveau", "invite someone new"),
  T("choisir l'amitié quand il faut choisir", "choose friendship when a choice is needed"),
  T("lancer un toast sans prévenir", "start a toast without warning"),
];

export const DILEMMAS = [
  [T("Lettre manuscrite", "Handwritten letter"), T("Message vocal", "Voice note")],
  [T("Amitié de dix ans", "A ten-year friendship"), T("Coup de foudre", "Love at first sight")],
  [T("Soirée à Lomé", "A night in Lomé"), T("Matin au calme", "A quiet morning")],
  [T("Dire la vérité tout de suite", "Tell the truth now"), T("Attendre le bon moment", "Wait for the right moment")],
  [T("Playlist lente", "A slow playlist"), T("Playlist qui fait danser", "A playlist that makes you dance")],
  [T("Voyage à deux", "A trip for two"), T("Grande tablée", "A big table")],
  [T("Cadeau fait main", "A handmade gift"), T("Temps offert", "The gift of time")],
  [T("Pseudo mystérieux", "A mysterious nickname"), T("Pseudo évident", "An obvious nickname")],
  [T("Film que tu connais par cœur", "A film you know by heart"), T("Film que personne n'a vu", "A film nobody has seen")],
  [T("Appeler", "A phone call"), T("Écrire", "Writing")],
  [T("Équipe amour", "Team love"), T("Équipe amitié", "Team friendship")],
  [T("Gage rigolo", "A silly dare"), T("Question profonde", "A deep question")],
  [T("Regarder les étoiles", "Watching the stars"), T("Regarder la ville", "Watching the city")],
  [T("Recette de famille", "A family recipe"), T("Restaurant nouveau", "A new restaurant")],
  [T("Dire je t'aime tôt", "Saying I love you early"), T("Le montrer d'abord", "Showing it first")],
  [T("Chaton sur l'épaule", "Kitten on the shoulder"), T("Chaton sur les genoux", "Kitten on the lap")],
];

export function pick(list, lang) {
  const item = list[Math.floor(Math.random() * list.length)];
  if (!item) return "";
  if (item.fr) return item[lang] || item.fr;
  return item;
}

export function line(item, lang) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item[lang] || item.fr;
}
