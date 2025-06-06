# Publishing Integration Plugin

**Package**: `@story-linter/plugin-publishing`
**Author**: Community
**Category**: Integration

## Overview

The Publishing Integration Plugin connects story validation with various publishing platforms, automating format conversion, metadata management, and platform-specific requirements. It ensures your narrative meets publishing standards across different outlets.

## Features

### Core Features
- **Format conversion** - Export to multiple formats
- **Platform validation** - Check platform requirements
- **Metadata generation** - Auto-create publishing info
- **Cover integration** - Validate cover specifications
- **ISBN management** - Track and validate ISBNs
- **Distribution tracking** - Monitor where published
- **Rights management** - Track publishing rights

## Configuration

```yaml
plugins:
  publishing:
    enabled: true
    formats:
      epub: true
      mobi: true
      pdf: true
      print: true
    platforms:
      amazon:
        enabled: true
        kdpSelect: false
      appleBooks: true
      kobo: true
      smashwords: true
    metadata:
      autoGenerate: true
      validateISBN: true
      trackRights: true
    quality:
      professionalMode: true
      validateCovers: true
      checkFormatting: true
```

### Configuration Options

#### `formats`
- Output format support for various platforms

#### `platforms`
- Platform-specific configurations and requirements

#### `metadata`
- `autoGenerate` (boolean): Create metadata automatically
- `validateISBN` (boolean): Check ISBN format
- `trackRights` (boolean): Monitor publishing rights

#### `quality`
- `professionalMode` (boolean): Enforce pro standards
- `validateCovers` (boolean): Check cover specs
- `checkFormatting` (boolean): Platform formatting rules

## Validation Rules

### Format Specification (PUB001)
Validates format requirements.

**Example Issue:**
```
EPUB image: 5MB
// Error: Image exceeds 2MB EPUB limit
```

### Metadata Completeness (PUB002)
Ensures all required metadata present.

**Example Issue:**
```yaml
metadata:
  title: "My Book"
  # Missing: author, description, keywords
// Error: Incomplete metadata
```

### Platform Requirements (PUB003)
Checks platform-specific rules.

**Example Issue:**
```
Amazon: Price $0.50
// Error: Below KDP minimum price $0.99
```

### ISBN Validation (PUB004)
Verifies ISBN format and checksum.

**Example Issue:**
```
ISBN: 978-1-234567-89-0
// Error: Invalid ISBN checksum
```

### Cover Specifications (PUB005)
Validates cover image requirements.

**Example Issue:**
```
Cover: 500x800px at 72dpi
// Error: Minimum 1600x2560px required
```

## Publishing-Specific Features

### Format Conversion

Generate multiple formats:

```yaml
conversion:
  epub:
    version: "3.0"
    validation: "epubcheck"
    fonts: "embedded"
    images: "optimized"
  mobi:
    generator: "kindlegen"
    compression: "standard"
  pdf:
    preset: "ebook"  # ebook, print, web
    fonts: "embedded"
    colorSpace: "RGB"
```

### Platform Profiles

Platform-specific requirements:

```yaml
platforms:
  amazon:
    formats: ["mobi", "epub"]
    metadata:
      categories: 2
      keywords: 7
    pricing:
      min: 0.99
      max: 9.99
    drm: optional
  appleBooks:
    formats: ["epub"]
    metadata:
      itunesCategories: required
      previewPercentage: 10
    validation: "strict"
```

### Metadata Templates

Auto-generate publishing metadata:

```yaml
metadata:
  templates:
    fiction:
      - title
      - subtitle
      - author
      - description
      - bisacCodes
      - keywords
      - language
      - publicationDate
    series:
      - seriesName
      - volumeNumber
      - previousISBN
```

## Best Practices

1. **Validate early** in publishing process
2. **Maintain metadata** throughout writing
3. **Test all formats** before submission
4. **Track ISBNs** systematically
5. **Check platform updates** regularly

## Common Issues and Solutions

### Issue: Multiple editions
**Solution**: Edition tracking
```yaml
editions:
  tracking: true
  types: ["ebook", "paperback", "hardcover", "audio"]
  isbnPerEdition: true
  metadataVariations: allowed
```

### Issue: Regional publishing
**Solution**: Territory management
```yaml
territories:
  rights:
    worldwide: true
    exceptions: ["UK", "ANZ"]
  pricing:
    currency: "USD"
    regionalPricing: true
```

## Distribution Features

### Multi-Platform Upload

Automate distribution:

```yaml
distribution:
  batch: true
  platforms: ["amazon", "apple", "kobo"]
  scheduling:
    preorder: supported
    simultaneousRelease: true
  tracking:
    sales: true
    reviews: aggregate
```

### Rights Management

Track publishing rights:

```yaml
rights:
  territories:
    granted: ["North America", "Europe"]
    reserved: ["Asia", "Africa"]
  formats:
    electronic: "worldwide"
    print: "English-speaking"
    audio: "licensed"
  duration:
    term: "life+70"
    reversion: "5-years"
```

## Print Specifications

### Print-Ready Validation

For physical books:

```yaml
print:
  interior:
    trim: "6x9"
    margins: "mirror"
    bleed: false
    colorMode: "black"
  cover:
    spine: "calculated"
    bleed: 0.125
    resolution: 300
    colorMode: "CMYK"
```

## Integration with Other Plugins

- Metadata Plugin (publishing metadata)
- Format validators (output checking)
- Git Plugin (release management)

## Future Enhancements

1. **Direct platform upload APIs**
2. **Sales tracking dashboard**
3. **Review aggregation**
4. **Marketing material generation**
5. **Print-on-demand integration**