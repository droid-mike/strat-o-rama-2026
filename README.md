# Strat-O-Rama — Modern Baseball-Reference Compatibility Fork

A modernized fork/adaptation of Matthew Butler's MIT-licensed **strat-o-rama** card generator.

This version was updated to work with current Baseball-Reference CSV layouts and to make the generated cards easier to print and use at the table.

> **Important:** These are unofficial, fan-generated cards based on an independent approximation of a Strat-style Basic card system. This project is not affiliated with, endorsed by, or sponsored by Strat-O-Matic Media, LLC.

## What's changed

Compared with the original project, this fork adds or updates:

- Support for current Baseball-Reference headers such as `Player`, `Team`, `GIDP`, and `Pos`.
- Support for the current **Player Batting Against** table used for pitcher cards.
- Handling for Baseball-Reference's multi-row **Standard Fielding** header.
- Matching players primarily by Baseball-Reference player ID, which helps with accents and punctuation in names.
- Full-season handling for traded players by preferring aggregate `TOT`, `2TM`, `3TM`, etc. rows where appropriate.
- AL, NL, and MLB batting averages calculated directly from the supplied season data.
- Current team naming, including Cleveland Guardians and Athletics.
- Team names printed directly on cards for easier sorting.
- Optional roster-level team overrides, useful for postseason rosters and traded players.
- Larger, more readable result text and footer statistics.
- Pitcher columns labeled **4, 5, 6** while batter columns remain **1, 2, 3**.
- Foul outs labeled `FO` rather than the ambiguous `FOUL`.
- A roster generator for creating a selected set of cards.
- A **6-cards-per-page printable PDF sheet generator**.
- No npm dependencies. A normal Node.js installation is enough.

## Requirements

- Node.js
- Four Baseball-Reference CSV files for the season you want to generate

No `npm install` is required for the current code.

## Baseball-Reference data files

Create a `data/` folder if it does not already exist and place these four CSV exports in it:

1. **Standard Batting**
2. **Standard Pitching**
3. **Standard Fielding**
4. **Player Batting Against**

The included `config.js` currently expects these filenames:

```text
2026-standard-batting.csv
2026-standard-pitching.csv
2026-standard-fielding.csv
2026-batting-against.csv
```

So your folder should look like:

```text
data/
  2026-standard-batting.csv
  2026-standard-pitching.csv
  2026-standard-fielding.csv
  2026-batting-against.csv
```

The CSV data itself is **not included in this repository**. Download/export the tables for your chosen season from Baseball-Reference and save them locally.

If you use another season or different filenames, edit the paths in `config.js`.

## Validate your data

Before generating cards, run:

```bash
node validate.js
```

The script reports whether all four configured files were found and prints league batting averages calculated from the supplied data.

## Generate one player card

```bash
node app.js "José Ramírez"
```

The generated PDF goes into the `players/` directory.

### Override the team printed on the card

This is useful for traded players or postseason rosters:

```bash
node app.js "Tommy Pham" --team CHW
```

The card still uses the player's full-season statistical data, but prints the requested team name.

### Generate a pitcher's batting card

By default, a pitcher gets a pitching card. To generate that pitcher's batting card instead:

```bash
node app.js "Tanner Bibee" -b
```

## Generate a regular-season team

Use the Baseball-Reference team code:

```bash
node app.js CLE
```

This generates cards for players who appeared for that team in the supplied **regular-season fielding table**.

Team mode is therefore not necessarily the same as a postseason active roster. A traded player may appear for more than one club during the season.

For a specific roster, use a roster text file as described below.

## Generate cards from a roster file

A roster is simply a text file with one player per line.

Example:

```text
José Ramírez
Steven Kwan
Andrew Benintendi
Kyle Teel
```

You can also force the team printed on a card with:

```text
CLE|José Ramírez
CLE|Steven Kwan
CHW|Andrew Benintendi
CHW|Kyle Teel
```

Lines beginning with `#` are comments and are ignored.

An example is included at:

```text
rosters/example_roster.txt
```

Generate all cards in that roster with:

```bash
node generate_roster.js rosters/example_roster.txt
```

The individual PDFs are written to `players/`.

# Printing 6 cards per page

The included `make_sheets.js` utility combines individual card PDFs into a US Letter **landscape** PDF with:

- **6 cards per page**
- **3 cards across × 2 cards down**
- automatic scaling
- spacing between cards for easier cutting

There are two useful ways to create sheets.

## Option 1: Put every card in `players/` onto 6-up sheets

After generating your cards, run:

```bash
node make_sheets.js players print_sheets_6up.pdf
```

This takes every PDF in `players/`, sorts them alphabetically, and creates:

```text
print_sheets_6up.pdf
```

Open that PDF and print it in **landscape orientation**. For predictable card size, print at **Actual Size / 100%** rather than using an additional printer-driver "Fit to page" setting.

## Option 2: Make 6-up sheets from a roster, in roster order

This is usually the better choice for a replay, tournament, postseason series, or selected set of teams.

First generate the roster cards:

```bash
node generate_roster.js rosters/example_roster.txt
```

Then create the sheet using the same roster file:

```bash
node make_sheets.js players roster_print.pdf --list rosters/example_roster.txt
```

The `--list` option does two things:

1. Includes **only** the players named in the roster file.
2. Keeps the cards in the **same order as the roster file**.

This makes it easy to group a lineup, bench, starting pitchers, and bullpen however you want before printing.

### Example: separate team sheets

You can create separate roster files such as:

```text
rosters/white_sox.txt
rosters/guardians.txt
```

Then run:

```bash
node generate_roster.js rosters/white_sox.txt
node make_sheets.js players white_sox_print.pdf --list rosters/white_sox.txt

node generate_roster.js rosters/guardians.txt
node make_sheets.js players guardians_print.pdf --list rosters/guardians.txt
```

## Reordering cards on a 6-up sheet

There is no special layout file to edit. Simply reorder the names in your roster `.txt` file and run `make_sheets.js` again with `--list`.

For example:

```text
# Starting lineup
CHW|Player One
CHW|Player Two
CHW|Player Three

# Bench
CHW|Player Four
CHW|Player Five

# Pitchers
CHW|Pitcher One
CHW|Pitcher Two
```

Comments are ignored, so you can organize the roster file for your own convenience.

## Useful command summary

```bash
# Check the four data files
node validate.js

# One player
node app.js "José Ramírez"

# One player with team override
node app.js "Tommy Pham" --team CHW

# Pitcher's batting card
node app.js "Tanner Bibee" -b

# Everyone who appeared for a team in the regular-season fielding data
node app.js CLE

# Selected roster
node generate_roster.js rosters/example_roster.txt

# 6-up sheets from every card currently in players/
node make_sheets.js players print_sheets_6up.pdf

# 6-up sheets containing only a roster, preserving roster order
node make_sheets.js players roster_print.pdf --list rosters/example_roster.txt
```

## Project layout

```text
strat-o-rama/
  app.js
  card.js
  config.js
  csv.js
  data.js
  generate_roster.js
  make_sheets.js
  pdf.js
  player.js
  team.js
  validate.js
  package.json
  LICENSE
  README.md
  data/
    .gitkeep
  players/
    .gitkeep
  rosters/
    example_roster.txt
```

## Notes about generated cards

This project deliberately preserves the basic probability/card-building approach of the original `strat-o-rama` project while adapting its data ingestion and printing workflow to current Baseball-Reference exports.

It does **not** claim to reproduce official Strat-O-Matic cards or proprietary card-generation formulas.

## License and original project

This project is distributed under the **MIT License**. See `LICENSE`.

Original project by Matthew Butler:

https://github.com/mbutler/strat-o-rama

If you publish your fork, please retain the original copyright and MIT license notice.

## Publishing this fork through the GitHub website

You can maintain this project without using Git on your computer.

1. Open the original `mbutler/strat-o-rama` repository on GitHub.
2. Click **Fork** and create the fork under your account.
3. In your fork, use **Add file → Upload files** to upload the files from this release package.
4. Replace matching source files when GitHub prompts you and add the new files/directories.
5. Enter a commit message such as `Update for current Baseball-Reference formats and readable print cards`.
6. Commit the changes to your fork.

You can edit `README.md` or any other text/code file later directly in the browser. Open the file, click the **pencil/Edit** button, make your changes, preview them if desired, and commit the edit.

For a more IDE-like browser experience, GitHub also provides the `github.dev` web editor.

## Contributing

Pull requests and improvements are welcome. Useful areas for future work include:

- support for additional Baseball-Reference format changes
- configurable seasons/filenames from the command line
- more print layouts, including 4-up large-print sheets
- card appearance/layout options
- additional validation and tests
