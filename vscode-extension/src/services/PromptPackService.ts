import * as fs from 'fs';
import * as path from 'path';
import type { PromptPackInfo, PromptPackContent, PromptMappings, PromptPackSelection } from '../types';

type PackCategory = 'owasp' | 'maintainability' | 'threat-modeling';

const CATEGORY_DIRS: Record<PackCategory, string> = {
  'owasp': 'owasp',
  'maintainability': 'maintainability',
  'threat-modeling': 'threat-modeling',
};

export class PromptPackService {
  private packsDir: string;
  private mappings: PromptMappings;
  private packCache = new Map<string, string>();

  constructor(extensionPath: string) {
    this.packsDir = path.join(extensionPath, 'prompt-packs');
    this.mappings = this.loadMappings();
  }

  private loadMappings(): PromptMappings {
    const mappingsPath = path.join(this.packsDir, 'mappings.json');
    try {
      return JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    } catch {
      return {
        codeql_to_owasp: {},
        owasp_categories: {},
        maintainability_triggers: {},
        severity_mapping: {},
        label_mapping: {},
      };
    }
  }

  getAllPacks(): PromptPackInfo[] {
    const packs: PromptPackInfo[] = [];

    for (const [category, dir] of Object.entries(CATEGORY_DIRS)) {
      const catDir = path.join(this.packsDir, dir);
      if (!fs.existsSync(catDir)) {
        continue;
      }
      const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        packs.push({
          id: file.replace('.md', ''),
          category: category as PackCategory,
          name: this.formatName(file, category as PackCategory),
          filename: file,
        });
      }
    }

    return packs;
  }

  getPacksByCategory(category: PackCategory): PromptPackInfo[] {
    return this.getAllPacks().filter(p => p.category === category);
  }

  getPackContent(packId: string): string | null {
    if (this.packCache.has(packId)) {
      return this.packCache.get(packId)!;
    }

    for (const dir of Object.values(CATEGORY_DIRS)) {
      const filePath = path.join(this.packsDir, dir, `${packId}.md`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.packCache.set(packId, content);
        return content;
      }
    }

    return null;
  }

  getSelectedPackContents(selection: PromptPackSelection): PromptPackContent[] {
    const contents: PromptPackContent[] = [];

    for (const id of selection.owasp) {
      const content = this.getPackContent(id);
      if (content) {
        contents.push({
          id,
          category: 'owasp',
          name: this.formatName(`${id}.md`, 'owasp'),
          filename: `${id}.md`,
          content,
        });
      }
    }

    for (const id of selection.maintainability) {
      const content = this.getPackContent(id);
      if (content) {
        contents.push({
          id,
          category: 'maintainability',
          name: this.formatName(`${id}.md`, 'maintainability'),
          filename: `${id}.md`,
          content,
        });
      }
    }

    for (const id of selection.threatModeling) {
      const content = this.getPackContent(id);
      if (content) {
        contents.push({
          id,
          category: 'threat-modeling',
          name: this.formatName(`${id}.md`, 'threat-modeling'),
          filename: `${id}.md`,
          content,
        });
      }
    }

    return contents;
  }

  getRelatedPacks(selection: PromptPackSelection): PromptPackSelection {
    const related: PromptPackSelection = {
      owasp: [...selection.owasp],
      maintainability: [...selection.maintainability],
      threatModeling: [...selection.threatModeling],
    };

    for (const owaspId of selection.owasp) {
      const category = this.mappings.owasp_categories[owaspId];
      if (!category) {
        continue;
      }

      for (const threat of category.threat_model) {
        if (!related.threatModeling.includes(threat)) {
          related.threatModeling.push(threat);
        }
      }

      for (const maint of category.maintainability) {
        if (!related.maintainability.includes(maint)) {
          related.maintainability.push(maint);
        }
      }
    }

    return related;
  }

  getMappings(): PromptMappings {
    return this.mappings;
  }

  private formatName(filename: string, category: PackCategory): string {
    const base = filename.replace('.md', '');

    if (category === 'owasp') {
      const owaspCat = this.mappings.owasp_categories[base];
      if (owaspCat) {
        return owaspCat.name;
      }
      const match = base.match(/A(\d{2})_(.*)/);
      if (match) {
        return `A${match[1]} - ${match[2].split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
      }
    }

    return base
      .split(/[-_]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
