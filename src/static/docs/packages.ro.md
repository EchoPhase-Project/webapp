# Pachete

Un pachet reunește workflow-uri care merg împreună, așa cum un depozit reunește cod. Fiecare workflow stă într-un singur pachet.

## Ce le dă pachetul workflow-urilor sale

- **Apeluri.** Un workflow poate rula alt workflow din același pachet (blocul ExecuteWorkflow). Îl numește după _cheie_, care nu se schimbă la redenumire și este aceeași în orice copie instalată. Workflow-urile altor pachete nu pot fi apelate.
- **Stocare.** Blocul Storage păstrează valori între rulări: ale unui workflow (domeniul _Workflow_) sau comune tuturor workflow-urilor pachetului (domeniul _Package_). Alte pachete nu le văd.
- **Erori.** Un workflow al pachetului poate trata rulările eșuate: când eșuează o rulare automată (webhook, programare, eveniment) a oricăruia dintre ele, pornește ErrorTrigger-ul lui cu ce a eșuat și de ce. Se alege în setările pachetului.

## Cum începeți

- **Pachet nou** pe pagina Pachete creează unul gol; importați workflow-uri în el din fișiere exportate.
- Importul unui workflow fără pachet ales creează un pachet doar pentru el, cu același nume.
- Instalarea unui pachet din [Explorare](/docs/explore) creează un pachet al dvs. cu workflow-urile lui.

## Publicare

Un pachet rămâne al dvs. până publicați o _versiune_: o copie fixă a workflow-urilor lui, pe care alții o citesc și o instalează. Următoarea publicare creează versiunea următoare; cele vechi rămân.

Alegeți ce workflow-uri intră într-o versiune (la început toate). Ce apelează un workflow ales și workflow-ul de erori al pachetului trebuie alese și ele: altfel cine instalează ar avea un apel spre nimic, iar publicarea este refuzată.

Secretele webhook-urilor nu se publică. Restul din blocuri (o cheie API într-un antet) se publică așa cum este.

## Cine îl vede

- **Privat**: dvs. și persoanele cu care îl partajați (după numele de utilizator).
- **Nelistat**: oricine autentificat care are linkul.
- **Public**: toată lumea, listat în Explorare.

Se schimbă în setările pachetului, la _Vizibilitate_. Alții văd doar versiunile publicate; workflow-urile dvs. așa cum sunt acum rămân ale dvs.

## Ștergere

Ștergerea unui pachet șterge workflow-urile lui, cu versiunile, programările și stocarea lor, și versiunile publicate. Pachetele instalate de alții din el rămân ale lor.
