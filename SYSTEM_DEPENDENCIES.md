# System dependencies — Armia Doc backend

## Required fonts

The document-generation worker requires genuine Microsoft Times New Roman.

Ubuntu packages:

- fontconfig
- ttf-mscorefonts-installer

Installation:

    apt update
    apt install fontconfig ttf-mscorefonts-installer
    fc-cache -f

Required validation:

    fc-match -f 'family=%{family}\nfile=%{file}\n' 'Times New Roman'

The returned family must be:

    Times New Roman

Liberation Serif, Nimbus Roman, Noto Serif and other substituted fonts are not
allowed because they change DOCX pagination and invalidate bottom-margin checks.
