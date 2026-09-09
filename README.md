# BIESpresent

The big-screen board for an event night. BIES branding, the night's itinerary, the live
time, and a countdown to whatever happens next — so someone standing with a drink can see
that the MC starts in 09:47 without having to ask anyone.

**`BIESpresent.html` is the whole thing.** One file. Double-click it, press `F`.
No install, no account. Nothing the room sees ever needs wifi — the only request this file
makes is looking up the name of a YouTube track, and only if you paste one in.

Use **Chrome or Brave** — both were tested end to end, including the second screen. Safari
will not store anything for a file opened from disk, so the schedule would be lost on every
refresh; the board detects that and says so if you open it there.

## Launching it

**Double-click `BIESpresent.app`.** It opens the board in a window with no tabs and no
address bar, which is what you want in front of a room.

Keep it in this folder — it looks for the HTML next to itself. To reach it quickly, drag it
onto the **Dock**: that makes a shortcut back to it here rather than a copy, so it keeps
working. It prefers the BIES-brand build when that has been made, and falls back to the
published one.

Double-clicking `BIESpresent.html` itself also works and always will. You just get the
browser's tabs and address bar around the board, and `F` for fullscreen hides those anyway.

> **Stay with one browser.** The schedule, the decks and the media are stored *by the
> browser*, so a night set up in Chrome is not there when you open it in Brave — it will look
> like your work vanished. The app opens Brave; the top of
> `BIESpresent.app/Contents/MacOS/BIESpresent` is one line to change if you would rather it
> opened Chrome, which allows about 3 GB of media against Brave's 2 GB. That only matters if
> you load a lot of video.

The app is not signed by Apple. Cloning this repository is fine, but if someone **downloads
it as a zip**, macOS quarantines it and refuses to open it — right-click the app and choose
**Open** once, and it will stop asking.

---

## On the night

1. Copy `BIESpresent.html` onto the laptop that drives the screen.
2. **Check the laptop's clock is right.** Every countdown on the screen is worked out from
   it. This is the one thing that will make the board wrong.
3. Open the file in **Google Chrome**. (Safari refuses to let a page opened from disk save
   anything, so the schedule would vanish on the first reload. The setup screen warns you
   if it detects this.)
4. The setup screen opens on first run. Fill in the event, check the schedule, press
   **Start the night**. It goes fullscreen.
5. Plug into the TV or projector and mirror the display.

That's it. It runs itself from there — nobody has to babysit the laptop.

---

## Two screens

Click **Second screen** (or press `S`). A second window opens — that one is what the room
sees. It carries no buttons, no status chips and no editor, and it ignores the keyboard
entirely, so nothing you do on the laptop can leak onto the TV.

Where Chrome grants the window-management permission the window opens straight onto the
external display. Otherwise drag it across yourself, then click it once to go fullscreen.

The laptop keeps showing the same board as a confidence monitor, plus the controls. Slip,
advance, blackout, panel changes and schedule edits all reach the audience screen within a
quarter-second. The second screen can never write anything back.

> The two windows stay in step because the board is worked out entirely from the config and
> the system clock — there is no live connection to keep alive and nothing to reconnect.

---

## Getting out of the slideshow

**Move the mouse.** Buttons fade in at the bottom right — **Keys**, **Second screen**,
**Fullscreen** and **Edit tonight**. They also show for a few seconds whenever the board
starts, then fade so the room never sees them. `E` does the same thing from the keyboard.

Nothing sits permanently in the corners. The bottom-left stays empty unless something is
actually worth saying — running in manual, paused, rehearsing, minutes behind schedule, or a
second screen live.

They sit above the blackout and break screens too, so you are never stuck.

---

## Changing things while the event is running

Open the editor mid-event and it behaves differently from the first-run setup:

- It opens straight on the **Schedule** tab, because that is what you came for.
- A live strip across the top keeps showing **what the room is looking at right now** and
  the countdown, so you are not editing blind.
- The main button reads **Back to the screen** instead of Start the night.
- Every change reaches the board the moment you go back.

**Adding something on the night.** Press **+** on the segment you want it to follow, name it,
give it a length — every segment after it moves by exactly that much, and the finish time
updates with them. Change its length again and they move again.

**The present never moves.** Adding, removing or reordering during a live event only ever
affects what has not happened yet: the segment on screen is held at the moment it actually
started. Insert ten minutes *ahead* of the live segment and the board stays exactly where it
is rather than jumping backwards into something the room never saw. Delete the live segment
and the next one takes over from that same moment. Before doors, with nothing yet underway,
an edit shifts the whole night as you would expect.

**Your slip is preserved** too — the time you have already lost or gained stays attached to
the right rows, so the board never snaps back to the original plan. Same if you change the
start time: once the night is running, that no longer resets anything.

Each row has a **+** to insert a segment directly below it, so an unplanned announcement goes
where it actually belongs rather than at the end of the list. Its default length is 10
minutes; set it to whatever you need and the rest of the night re-chains.

Two things it deliberately will not do: delete the last remaining segment, and reload the
standard night mid-event without warning you first that it wipes everything.

> One caveat worth knowing: if the laptop is **mirroring** to the TV, the room sees the editor
> while it is open. Press `B` to blackout first if that matters, or keep the visit short — the
> live strip means you can be in and out in seconds.

---

## Keys

| Key | What it does |
| --- | --- |
| `F` | Fullscreen |
| `→` / `←` | Next / previous **slide**, whenever a deck is on the wall — otherwise the next / previous **segment** |
| `N` / `P` | Start the next segment now / go back one, deck or no deck |
| `+` / `−` | Push the rest of the night later / earlier by **5 minutes** |
| `Shift` `+` / `−` | Same, by **1 minute** |
| `A` | Auto-advance on/off |
| `Space` | Pause / resume the schedule clock |
| `1` `2` `3` `4` | Hold one panel — tonight / upcoming / QR / partners |
| `R` | Resume panel rotation |
| `B` | Blackout — clean screen for the projector |
| `T` | Hide / show the clock times on the running order |
| `E` | Edit tonight's schedule (same as the **Edit tonight** button) |
| `S` | Send the audience view to the second screen |
| `Page ↓` / `Page ↑` | Next / previous slide — what a presenter's clicker sends. So do `↓` `↑` |
| `X` | Take whatever is on the screen off air |
| `D` | Rehearse — replay the whole night in about 50 seconds |
| `?` | Show the key list on screen (or the **Keys** button) |
| `Esc` | Close an overlay, or leave rehearse |

---

## When the night runs late

It always does. The board is built to describe *tonight*, not the plan.

- **Doors opened 12 minutes late?** Press `−` twice before the first segment starts and the
  whole night shifts.
- **The speaker is overrunning?** Press `+` while their segment is live. That segment
  stretches and everything after it moves with it. A chip in the corner starts reading
  "15 min behind" so the team can see the damage.
- **Finished early?** Press `→` (or `N`) to start the next thing immediately. **This moves
  where we are, not the times.** Everything on the running order stays as written; the board
  simply jumps ahead of the clock, and the clock catches up on its own and carries on from
  there. Moving through the night and re-timing it are two different jobs, and `+` / `−` is
  the one that re-times it.

By default the board advances on the clock by itself. Press `A` and it stops advancing and
waits for you instead — and when a segment passes its planned end, the countdown turns
orange and counts **up** (`+04:12`) rather than sitting at zero pretending everything is
fine. Use manual mode when you want the screen to hold on a segment no matter what. Pressing
`←` also switches to manual, because going *back* means going against the clock; `A` hands
it back.

**Want the times back?** **Reset to the original times**, on the Schedule tab, puts every
time back to the running order as it stood *before the night started* — clearing the slip,
any stretched segment and any pinned start, and restoring the lengths and the start time.
It only ever touches times: no segment is added, removed or renamed, and anything you added
during the night keeps the length you gave it. The line under the button says exactly what
it would undo before you press it, and the button is greyed out when there is nothing to
undo.

Everything in the editor counts as the plan right up until the night starts — so a schedule
you paste in, then tidy up by hand over the afternoon, is what you get back. From the moment
the first segment begins, the editor is describing what is actually happening and the plan
is frozen.

**Gone so far off plan that the printed times are a liability?** Press `T`, or tick *Hide the
clock times on the screen* on the Schedule tab. The running order, the marker on where we
are and the countdown all stay — only the clock times go, and only on the screen. You can
still see and edit them in the control window while the room sees none of it.

**Breaks take over the whole screen** with one enormous timer, because that is the moment
the timer actually matters. Tick the "Break" box on any segment to get that.

---

## Stepping out to show a deck

Switching to PowerPoint, Keynote or anything else does **not** disturb the schedule. Every
countdown is worked out from the system clock each time it draws, so the board is correct
the instant you come back — whether you were away six seconds or an hour. You can close the
file entirely and reopen it and it resumes exactly where the night actually is.

The one thing that *does* stop the clock is pressing `Space` (pause), and the chip in the
corner says so while it is paused. Rehearse mode (`D`) likewise runs on a fake clock until
you press `Esc`.

---

## Converting a speaker's deck

`.pptx`, `.key` and Google Slides cannot be displayed by the board itself — a browser page
has no PowerPoint or Keynote layout engine, and anything claiming otherwise gets fonts and
spacing wrong in ways you only notice once it is on the wall. What the board *can* show,
perfectly, is a **PDF** or a **numbered set of slide images**.

Converting is a job for the afternoon, not the night, and there is a script for it.

1. Put the speakers' files in **`decks/inbox`** — `.pptx`, `.ppt`, `.key`, `.odp` or `.pdf`.
2. Double-click **`Convert Decks.command`**.
3. Each deck comes out in **`decks/ready`** as its own folder holding `deck.pdf` and
   `slides/slide-001.png`, `slide-002.png` and so on at 1920px wide.

Google Slides is a link rather than a file, so there is nothing to convert. Open it and use
**File > Download > PDF Document**, then drop that PDF in the inbox with the rest.

**Audio and video embedded in a deck do not survive the conversion.** A PDF is flattened
artwork; there is nowhere in it for a video to live, and every converter drops it. So the
script reaches into the original file — both `.pptx` and `.key` are zip archives — and lifts
the clips out whole into an **`embedded media`** folder beside the slides, telling you how
many it found. Load those into the Media tab and fire them by hand on the speaker's cue.

**Look at every `deck.pdf` before the night.** This is the step that matters. A converter
substitutes any font it does not have, and a substituted font is a different width — so a
heading that fitted on one line can wrap onto two and push a diagram off the slide. Two
minutes of scrolling through the PDFs is what stops that being discovered at 7:40pm.

### If a deck comes out wrong

The script uses two engines and picks between them: LibreOffice for PowerPoint and
OpenDocument files, because it runs headless and can never stall on a dialog, and Keynote
for `.key`, because that is Apple's own format and LibreOffice reads it only through a
reverse-engineered importer. Either can be forced from Terminal:

```
cd ~/Desktop/BIES\ CORE/event-screen
./Convert\ Decks.command --keynote        # usually better with a mangled .pptx
./Convert\ Decks.command --libreoffice
./Convert\ Decks.command --jpeg           # smaller files, for a deck of 60+ slides
./Convert\ Decks.command --width 2560     # sharper images for a 4K screen
```

Keynote is Apple's own PowerPoint importer, so `--keynote` is the first thing to try when a
`.pptx` looks broken. If both engines mangle the same slide, stop converting and ask the
speaker to export a PDF from the machine the deck was written on — that is always exact,
and it takes them one menu item.

Neither engine is installed by the board: Keynote is free from the App Store and comes on
most Macs, LibreOffice is a free download from libreoffice.org. The script says which of
them it found when it starts, and works with either one alone.

---

## Presentations, media and music

Three tabs in the setup screen (`E`) turn the board into a show-control desk. They share one
rule: **nothing reaches the room until you press "Send to screen"**, so you can line up the
next speaker's opening slide while the current one is still talking. Whatever is live is
named in an orange bar across the top of every tab, with **Take off air** beside it.

### Presentations

Load a deck one of two ways, and the choice decides who turns the pages.

**Slide images** — `+ Slide images`, then select every `slide-001.png`… of one deck at once.
They become that deck in filename order. You get next, back, jump-to-any-slide from the
control window, a thumbnail strip, and the countdown overlay. This is the one to use for
anything the tech is driving.

**PDF** — `+ PDF`. It goes up exactly as exported, at full quality, with Chrome's viewer
chrome switched off, and **the pages turn** — `→` `←`, `Page ↓` `Page ↑`, or the buttons in
the control window. The deck's length is read out of the file, so the control window says
*page 4 of 17* and the deck stops at its own last page rather than running off the end.

The one cost is that Chrome's PDF viewer cannot be moved after it has loaded, so each page
turn quietly loads a second copy of it. The page the room is looking at is held on screen
until the new one has painted, so the wall never flashes black — but there is about a
quarter of a second between the click and the change. For a deck being driven hard, slide
images are still instant; run the PDF through **Convert Decks** (it accepts PDFs) and import
the `slides/` folder instead.

**PowerPoint / Keynote** — logged against the speaker with the tag **needs converting**, and
that is all. Nothing in a browser can lay out a `.pptx`. Listing it is the point: the gap
shows up while you are setting up rather than when the speaker stands up.

Each row takes a **speaker name** and a **segment**, so the running order for the night is
visible in one place.

Once a deck is on the wall the **arrow keys move the deck, not the running order** — and so
do `Page ↓` / `Page ↑` and `↓` / `↑`, which between them cover every USB presenter clicker
worth having, so the speaker can drive their own slides off the board. `N` and `P` still move
the running order underneath. The control window's preview follows the wall, so what you are
looking at is never a page behind the room. `B` still blacks the screen out no matter what
is playing.

If a row says **files missing**, the browser has thrown the files away (cleared storage, or
an event file imported onto a different laptop — the JSON carries the running order, never
the media). Load them again.

### Media

Photos and video, for cut-aways and for the reel during the mingling hour.

- **Send to screen** puts one item up. Video starts playing; **Play/Pause** and **Restart**
  reach the second screen, so the control window shows the room's frame rather than drifting
  along on a second playback of its own.
- **Start the reel** runs through the photos in order, skipping videos. **Shuffle the
  photos** reorders them and leaves any video where it was, so a clip that belongs at a
  particular moment stays there.
- While it runs you have **Hold**, and **←  →** to skip by hand. Skipping restarts the dwell,
  so you never get a photo that flashes past because it inherited the last one's remaining
  time. Everything else — speed, crop, transition, Ken Burns — can be changed mid-reel and
  the second screen picks it up on the next tick, including for the photo already on the wall.
- It is driven from the control window, so leave that window open. When a reel that is not
  looping reaches the end it hands the wall back to the board rather than freezing on the
  last photo. Drag the
  rows to set the order the photos appear in.
- **Overlay** prints a strip along the bottom of whatever is playing, and **Logo** puts the
  BIES bug in the top right corner. Both apply to anything on the wall, not just the reel.

### Portrait photos on a landscape screen

Phones shoot portrait and the screen is 16:9, so every reel has to answer what to do with
the mismatch. Three ways, set for the reel and overridable per photo in the list:

| | What it does | When |
|---|---|---|
| **Fit** | The whole photo, black bars down the sides | Nothing is ever cropped away |
| **Fill** | Crops into the photo until it fills the screen | Landscape shots, where the crop is slight |
| **Blurred backdrop** | The whole photo, over a soft blown-up blur of itself | Portrait shots — no bars, nothing cropped |

**Fill will cut heads off portrait photos.** A tall photo on a wide screen loses most of its
height, so use it for landscape shots and reach for the blurred backdrop for the tall ones.
Each row in the media list has its own crop setting if one photo needs different treatment
from the rest.

### Transitions and Ken Burns

**Transition** is Cut, Crossfade or Dip to black, with a length in milliseconds. Crossfade at
about 800ms suits a photo reel; a cut suits anything the room is meant to read quickly.
Skipping faster than the transition length simply stacks the dissolves — nothing is stranded
on screen.

**Ken Burns** is the slow zoom and drift across a still photograph — named after the
documentary film-maker who made it his signature, because a static photo on a big screen
looks dead and a slowly moving one does not. It alternates direction down the reel so the
whole thing does not breathe in the same rhythm, and each push is timed to last a full dwell
plus the dissolve, so it is still moving as the next photo arrives over it.

Sound comes out of the screen facing the room, so plugging the laptop into the PA works the
way you would expect and nothing is heard twice.

### The on-air overlay

The strip along the bottom of whatever is on the wall. Turn it on with **Overlay** beside the
on-air bar; what it cycles through is set under **Screen panels → On-air overlay**.

It rotates between three kinds of card:

| Card | Reads |
| --- | --- |
| **Up next** | the next segment, with the live countdown |
| **Proudly sponsored by** | every partner name, run together |
| **See you at** | one card per upcoming event, with its date on the right |

Plus an optional free line of your own — a hashtag, say — which gets a card under the name of
tonight's event.

**The countdown card is dealt back in between every other card**, not queued up as one of
them. Whatever else is going round, the room is never more than one card away from knowing
how long is left. That is the one thing this board does that a deck cannot, so it does not
take its turn like everything else.

Both windows work out which card is showing from the clock rather than the operator
publishing it, so the second screen cannot fall a card behind.

**Seconds per overlay card** sets the pace and **Overlay text size** the size — 60% to 220%.
The default reads from the back of a small room; a long thin venue wants it bigger, and a
speaker's slide usually wants it smaller so it stays out of the way.

**Partners with no logo.** *Add name only* on the Screen panels tab takes a partner you have
no artwork for. The name is set in the display face and stands in for the logo, on the
partner panel and in the overlay both. Either way, the name in that field is what "Proudly
sponsored by" reads out — so fill it in even for the ones that have logos.

**The logo bug** is the BIES icon in the top right corner, on a transparent background with a
soft shadow so it holds up over a bright photograph. **Logo**, next to **Overlay**, switches
it on and off, and like the overlay it applies to anything on the wall.

### Music

**Two separate queues, and they have to be.** Audio files play from this window, through an
element this page controls. YouTube tracks play in a YouTube window this page cannot see
into — it cannot tell when a track ends, or start the next thing at the right moment. So
nothing can hand over between the two lists, and pretending otherwise would drop silence into
the room. Pick one source per stretch of the night.

**Audio files** need no internet at all. The transport across the top is a normal player:
back, play/pause, next, a seek bar you can drag or click anywhere on, elapsed and total time,
and a volume slider with a mute button. **Back restarts the track once you are more than a
few seconds in**, and only skips to the previous one if you press it near the start — the
same as every other player. The volume is this player's own level and is remembered between
nights; it does not touch the laptop's output, so the PA stays where the sound tech set it.
**Shuffle the order** reshuffles the list itself, so what you see is what will play.

Nothing here is ever sent to the second screen, and it keeps playing while the wall does
something else entirely.

**YouTube** needs a working connection, and will run an ad between tracks unless the account
is on Premium. Paste links — watch links, `youtu.be` links, shorts or bare ids — one per
line, then **Open the queue in YouTube**. That opens one unlisted ad-hoc playlist in a normal
browser window and the tracks run on from each other. No account, no upload, nothing created
in anyone's YouTube library. The cap is 50 tracks.

**Names are filled in automatically.** A YouTube link carries only a video id, so the artist
and track have to be asked for. Pasting a link fetches them from YouTube and splits them into
the two boxes — "Rick Astley" / "Never Gonna Give You Up", with `(Official Video)` and
`(4K Remaster)` trimmed off. Only known noise is trimmed: `(Remix)` and `(Live at Field Day)`
are part of a track's name and are kept. It is a guess made from a free-text field, so both
boxes stay editable, and a name typed by hand sticks.

> This is the one moment the control window touches the network, and it only happens when you
> paste a YouTube link — which needs a connection to play anyway. **With the wifi down it
> fails quietly**: the tracks still queue, they show their id, the note says how many are
> unnamed, and **Look up missing names** fills them in later. Once fetched, names are saved,
> so the queue reads properly offline from then on. The board itself never makes a request.

Two things this deliberately does not do. It does not **embed** the player: YouTube refuses
to play inside a page opened from a file, which is what this is — you get a "Video player
configuration error" and nothing else. And it does not **search** from inside the window:
that needs an API key, and a key baked into a file that gets emailed around is a key that
leaks. The search box opens a normal YouTube tab instead; copy the link back.

### Reordering any of these lists

The music queue, the audio playlist and the media reel all reorder the same way the schedule
does: **drag a row by the ⠿ handle on its left and drop it anywhere in the list.** The ↑ ↓
arrows are still there beside each row for nudging something one place without a drag, which
is easier on a trackpad in a dark room.

---

## The screen going to sleep

Three unattended hours of a mostly static board is exactly the situation a screensaver was
invented for, and the display sleeping mid-talk is the likeliest way to lose a night. Both
windows now ask the browser to hold the screen awake, and ask again every time the page comes
back — because stepping out to a PowerPoint drops the lock.

If the browser refuses, **the editor says so** and tells you to set display sleep to Never in
System Settings. It is worth glancing at the top of the editor before doors open.

This is not a substitute for plugging the laptop in. A Mac on battery still dims and sleeps
on its own schedule.

---

## Getting out of something that is on the screen

Whenever anything is on the wall — a deck, a photo, a clip — the controls in the bottom
right **stop fading out** and a **Take off air** button appears among them. Press `X`, or
click it. `B` still blacks the screen out, and `E` still opens the editor.

This matters most with a PDF. Chrome hands the keyboard to its own PDF viewer the moment
that viewer is clicked, and gives no sign it has done so — every key you press after that
goes to the PDF instead of to the board, so `E` and `B` quietly stop working. The board
notices and takes the keyboard back, so the keys keep working; the mouse wheel still scrolls
the PDF, because scrolling follows the pointer rather than the keyboard.

If you ever do feel stuck: the controls are always live in the bottom right, and closing the
tab and reopening the file loses nothing.

### Reopening the file

Refresh mid-talk and whatever was on the wall stays there — the second screen never blinks.
Open the file again more than **half an hour** later and it comes up clean instead, on the
assumption that this is a new sitting rather than a reload, and clears the second screen with
it. So a deck left up at the end of one night is not waiting on the wall at the start of the
next.

---

## Setting up a night in advance

Press `E`, or move the mouse and click **Edit tonight**. Four tabs:

- **Event** — name, code (`SN20260902`, the ops-schedule convention), date, start time.
- **Schedule** — the segments. **Click any start time and a picker drops down** — scroll
  the hour, minute and AM/PM columns and pick. It stays open while you adjust, and follows
  the row if the page scrolls.
  Setting a time restates the segment *before* it, so the handover lands when you said, and
  everything after re-chains. Change a length instead and everything after it moves. Drag
  the handle to reorder, **+** inserts a segment below, **×** removes one. Each row also has
  a quieter **note** field — see below.
  There is also a **Paste an itinerary** box — see below.
- **Screen panels** — the QR code, partner logos, and the "what's coming up" list.
  Type a link and the code is **generated on the machine** — offline, no watermark, and
  vector-sharp at any size. Or **upload your own** PNG, JPG or SVG and it takes over; the
  link field then only controls the address printed under the caption, and can be left
  empty. Either way a preview shows what the room will see. Uploads are kept lossless: an
  SVG is stored untouched, a bitmap is left alone unless it is over 1000px, and any
  resampling is done with smoothing off so the module edges stay hard enough to scan.
  Each partner logo takes a **name**, which is always used as the image's alt text; tick
  **Show name** to caption it on screen — worth doing only for logos that are a symbol with
  no wordmark, since captioning everything makes the panel noisy.
  Logos are **large by default** — one partner fills over half the panel, which is the usual
  case. Press **Arrange on screen** for a scale model of the whole display: drag each logo to
  move it, drag its corner to resize, or use Bigger / Smaller. Positions are percentages, so
  they hold at any resolution. Adding or removing a logo re-spaces them automatically;
  **Auto-arrange** puts them back to even spacing at any time.
  **Ops codes never appear on screen.** Anything shaped like `SN20260902` is stripped out of
  the upcoming-events list automatically, on the way in and again on the way out, so pasting
  straight from the ops sheet is safe.
- **Save & share** — **Export** writes a small `.json` file. Whoever is carrying the laptop
  imports it and has the identical night. Use this instead of talking someone through the
  form over WhatsApp.

### Saving

**Everything saves as you type it** — the event name, the schedule, the panels, all of it
goes to the browser the moment it changes, and a *Saved* marker confirms it. There is also a
**Save** button in the bottom bar if you want to press something. Edits are flushed again if
the window closes or the laptop lid shuts, so a refresh mid-event loses nothing even with the
editor still open.

### Pasting an itinerary in

Typing the schedule by hand is still the normal way, and everything below stays editable
whatever you do. But if the run of show already exists somewhere, open
**Paste an itinerary instead of typing it** at the top of the Schedule tab, drop it in, and
press **Read it**. A line under the button tells you what it understood — how many segments,
how long the night runs, how many breaks — *before* you replace anything.

It reads what Notion, Google Docs and Sheets actually put on the clipboard, including the
three-column `Time / Duration / Segment` table BIES uses:

```
Time      Duration   Segment          <- header row, skipped
4:00 PM   60 min     Set up           <- the duration column is consumed, not shown
5:00 PM   60 min     Doors open
Guests arrive/Host greets             <- no time, no length: becomes a note on the row above
[6:15 PM] 15 min     Speaker 1        <- square brackets are stripped
9:30      30 min     Tear down        <- no am/pm: read as evening, following 9:00 PM
6:30 PM - 7:00 PM    Doors open       <- a range states its own length
| 6:30 PM | Doors open |              <- markdown table rows
• 6:30 PM — Doors open                <- bulleted and numbered lists
Main talk — 25 min                    <- title and length, no clock at all
```

**Where a row has a time and so does the next one, the gap between them wins** — that is
what the times on screen will actually say, and in a hand-kept sheet it is the duration
column that drifts. A stated *range* still wins, because it names its own end. The duration
column is used where there is no following time, which is what the last row needs.

Times may cross midnight, and anything called *break*, *intermission* or *receso* is flagged
as a break. A line under the button says what it understood — segments, total length, start
time, breaks, notes — **before** anything is replaced. After it parses, the box closes itself
and hands you back the normal list to adjust by hand.

### Notes on a segment

Each row has a second, quieter field under its title. Whatever is in it shows on screen
underneath the segment name while that segment is live — good for "Guests arrive · Host
greets". Sub-lines from a pasted itinerary land here automatically, and they are editable
like anything else.

It is a paste box rather than a live Notion connection on purpose: Notion's API refuses
browser requests outright, so a page opened from disk cannot call it at all. Going through a
server would mean an integration token inside an HTML file that gets emailed around, and
would put venue wifi between you and your own itinerary at 7pm.

### The default schedule is a guess

There is no run-of-show document anywhere in BIES CORE — the ops system covers the calendar
layer (codes, announce/prep/debrief dates) but never the shape of a night. The nine-segment
social night the file ships with is a proposal, not something recovered from a past event.
Correct it, then export it as the house standard.

---

## Rehearsing

Press `D`. The whole night plays out at 240× — about 50 seconds for a three-hour programme.
Every segment change, the break takeover, the panel rotation and the overrun counter all
happen in front of you. Do this once before the first real event rather than discovering at
9pm that the break screen is broken. `Esc` returns to real time.

---

## Editing the file

`src/screen.html` is the readable source. `BIESpresent.html` is generated from it:

```sh
python3 build.py
```

That inlines the fonts as base64 and the logos as SVG. Nothing to install — `python3` ships
with macOS. Edit `src/screen.html`, run the build, and the distributable file is rewritten.

```
src/screen.html      the source — all the markup, style and logic
build.py             inlines fonts and logos, writes the built file
BIESpresent.html     the built file. This is the thing you hand someone
BIESpresent.app      double-click launcher: opens the board with no browser chrome
fonts/               the open fonts the published build uses, with their licences
Convert Decks.command  turns .pptx/.key/.pdf into slides the board can show
decks/               inbox and ready folders for the converter (not committed)
test/                the suites, and the fixtures they run against
```

### Two builds, one typeface apart

BIES's display typeface is **PP Formula Narrow Bold**, which is licensed from Pangram
Pangram and is not ours to publish. So the build makes two files that differ in that one
thing and nothing else — same logic, same logos, same Inter body text:

| | Display face | Written to | In the repo? |
|---|---|---|---|
| **open** | Barlow Condensed Bold, from `fonts/` | `BIESpresent.html` | yes — this is what people download |
| **brand** | PP Formula Narrow Bold, from the brandkit | `BIESpresent (BIES brand).html` | **no**, gitignored |

```sh
python3 build.py            # both, if the brandkit is on this machine
python3 build.py --open     # only the publishable one
python3 build.py --brand    # only the BIES one
```

Run it with no arguments on a machine that has `~/Desktop/BIES/brandkit/` and you get both,
always in step with each other. On a clone without the brandkit you get the open build alone,
and the build says so rather than failing.

**Use `BIESpresent (BIES brand).html` at actual BIES events.** The other one is what the
repository publishes, and it is the one the tests run against.

Barlow Condensed Bold was picked by rendering the countdown, the break screen and the
itinerary side by side against the real face and comparing: it is the same kind of bold
condensed grotesque, close in weight, width and colour, and it holds the layout at 19vw
without reflowing anything. The display family is aliased as `BIES Display` in the CSS, so
nothing downstream knows or cares which of the two it got.

### Tests

```sh
npm install          # once
npm test             # every suite
npm run test:fast    # the two pure-node suites, about a second
npm test -- qr sched # only suites whose name contains one of these
```

624 checks across 26 suites. Two run in plain node — the QR encoder against a reference
implementation, and the schedule maths. The rest drive **the real Google Chrome installed on
this machine**, not a bundled Chromium, because Chrome is what runs the board on the night;
`playwright-core` is the dependency precisely so nothing downloads a browser. Chrome has to
be installed for those to run.

`test/lib/qr.js` reads the encoder straight out of `src/screen.html` rather than keeping a
copy, so the test cannot pass against code the board no longer ships.

A handful of checks measure real elapsed time — a countdown advancing, a track playing, a
photo reel moving on. Running twenty browser suites back to back on a busy laptop can starve
those and report failures that are not real. **If a timing check fails, re-run that suite on
its own** (`npm test -- music`) before believing it.

Run the suites before touching anything in `src/screen.html`. Several of the rules in there
are not obvious — the present never moves when the schedule is edited mid-event, ops codes
are stripped on the way in and out, blackout outranks whatever is on air — and each is held
in place by a test rather than by anyone remembering.

### Brand sources

- **Fonts** — Inter Regular/SemiBold for body text, in `fonts/` under the SIL Open Font
  Licence, and used by both builds. The display face is the one thing that differs between
  them; see *Two builds, one typeface apart* above. Nothing licensed enters this repository.
- **Logos** — `Bies horizontal dark background.svg` and `Bies Icon dark background.svg`.
  `build.py` rewrites their `.cls-1` / `.cls-2` class fills into inline attributes; the
  brandkit SVGs all reuse those same class names, so inlining two of them into one document
  would otherwise make them collide.
- **Colours** — Deep Navy `#0A192F`, Cobalt Blue `#0047AB`, Blaze Orange `#FF5B00`,
  Snow `#F9F5F4`, taken from `BIES/src/index.css`.

> The hex values printed in the styleguide PDF are wrong — leftover template placeholders.
> Page 19 labels Cobalt Blue and Snow both as `0E0F12`, and page 22 still says the typeface
> is "Domaine Display" for the "Melograno brand". The rendered swatches are correct; the
> printed labels are not. Take colours from the CSS and the SVG fills.

---

## Notes

- **Nothing leaves the machine.** No CDN, no fonts fetched, no analytics, no API. Verified
  with the network watched: zero requests. The QR code is generated on the laptop.
- **The QR is verified by actually reading it.** The test suite screenshots the rendered
  panel and decodes it with a QR reader, so both the generated and the uploaded paths are
  proven to scan off the screen rather than merely to look right.
- **Burn-in** — the background drifts slowly and the panels rotate, so nothing sits static
  on a TV for three hours.
- **Overscan** — content keeps a 4% margin off every edge, since projectors and hotel TVs
  crop.
- **Partner logos** are shrunk on import to stay inside the browser's storage budget; the
  setup screen shows how much is used. Pale or white logos read best on the dark screen.
