# Workflow-uri

Un workflow este un program din blocuri, păstrat într-un [pachet](/docs/packages). Declanșatoarele lui pornesc rulări; fiecare bloc face un singur lucru (o cerere HTTP, un apel Discord, o notiță, o valoare în stocare) și dă ieșirea următorului.

## Pornire

Declanșatoarele unui workflow pornesc rulări doar cât timp **Rulare la declanșatoare** este activ. Rularea manuală (**Rulează acum**, cu o intrare JSON) merge oricum.

## Declanșatoare

- **ManualTrigger**: manual sau când îl apelează alt workflow al pachetului.
- **WebhookTrigger**: un POST la adresa lui cu antetul `X-Webhook-Secret` egal cu secretul lui; corpul JSON este intrarea rulării. Pagina workflow-ului arată adresa și, la cerere, secretul; **Secret nou** îl înlocuiește (cel vechi nu mai merge imediat). Ce primește apelantul:
    - _Immediately_: imediat 202, cu id-ul rulării;
    - _OnFinish_: așteaptă rularea și primește ieșirea ultimului bloc (500 dacă eșuează);
    - _ByBlock_: așteaptă un bloc RespondToWebhook și primește ce trimite acesta.
- **ScheduleTrigger**: o programare cron (cinci câmpuri) în fusul orar al workflow-ului sau al dvs.
- **Evenimente Discord**: un eveniment al unei conexiuni Discord a dvs.
- **ErrorTrigger**: în workflow-ul de erori al pachetului, când eșuează o rulare automată a pachetului.

## Rulări

Fiecare rulare se păstrează o vreme: starea, ce a pornit-o, cât a durat și, cât timp serverul îl păstrează, rezultatul (ieșire, variabile, erori). Rulările unui workflow sunt pe pagina lui; cele ale tuturor workflow-urilor unui pachet la _Rulări_ ale pachetului.

## Versiuni

Fiecare modificare a programului este o versiune nouă (se păstrează ultimele 50). O versiune veche poate fi restaurată: devine cea curentă ca versiune nouă deasupra, nimic nu se pierde. Un workflow sau una dintre versiunile lui se exportă într-un fișier care se importă pe orice server EchoPhase.
