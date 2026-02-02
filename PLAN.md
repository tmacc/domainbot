# DomainBot

A domain name agent that generates creative domain name suggestions based on an idea and checks their availability.

## Overview

DomainBot takes a user's idea or concept and:
1. Generates creative, relevant domain name suggestions
2. Checks domain availability via an API
3. Returns a list of available domains for the user to consider

## Core Features

- **Idea Input**: Accept a description of a project, business, or concept
- **Name Generation**: Generate multiple domain name candidates based on the idea
- **Availability Check**: Query a domain availability API to verify which domains are available
- **Results Display**: Present available domains to the user

## Architecture

```
User Input (idea)
       |
       v
Name Generator (brainstorm domain names)
       |
       v
Domain Availability API (check each candidate)
       |
       v
Results (list of available domains)
```

## Components

### 1. Name Generator
- Parse the input idea for keywords
- Generate variations (prefixes, suffixes, compounds, abbreviations)
- Support multiple TLDs (.com, .io, .co, .dev, etc.)

### 2. Domain Checker
- Integrate with a domain availability API
- Handle rate limiting and errors gracefully
- Cache results to avoid redundant lookups

### 3. User Interface
- CLI interface for input/output
- Clear formatting of results

## API Options

Potential domain availability APIs to consider:
- GoDaddy API
- Namecheap API
- Domain.com API
- WHOIS lookup services

## Tech Stack

TBD - to be decided based on preferences

## Next Steps

1. Choose tech stack
2. Select and set up domain availability API
3. Implement name generation logic
4. Build CLI interface
5. Test and refine
