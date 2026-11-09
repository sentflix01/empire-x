import { describe, it, expect } from 'vitest';
import { parseShowroomSections, sectionList, serializeShowroomSections } from '@/lib/showroomSectionsCodec';

describe('showroomSectionsCodec', () => {
  it('parses stored JSON into keys and fields, skipping unknown sections', () => {
    const parsed = parseShowroomSections(JSON.stringify([{ type: 'hero', title: 'Shop' }, { type: 'not-a-section', x: 1 }, 'about']));
    expect(parsed.keys).toEqual(['hero', 'about']);
    expect(parsed.fields.title).toBe('Shop');
  });

  it('tolerates bad input', () => {
    expect(parseShowroomSections('not json')).toEqual({ keys: [], fields: {} });
    expect(parseShowroomSections(null)).toEqual({ keys: [], fields: {} });
  });

  it('round-trips, keeping each section to its own fields', () => {
    const stored = [{ type: 'hero', title: 'Shop', subtitle: 'Best' }, { type: 'about', aboutTitle: 'About' }];
    const { keys, fields } = parseShowroomSections(stored);
    expect(serializeShowroomSections(keys, fields)).toEqual(stored);
  });
});

describe('sectionList', () => {
  it('always returns a list of section objects', () => {
    expect(sectionList(null)).toEqual([]);
    expect(sectionList(undefined)).toEqual([]);
    expect(sectionList('null')).toEqual([]);
    expect(sectionList('not json')).toEqual([]);
    expect(sectionList('{"type":"hero"}')).toEqual([]);
    expect(sectionList('[{"type":"hero"},null,"about",{"type":"contact","whatsapp":"+251"}]')).toEqual([{ type: 'hero' }, { type: 'contact', whatsapp: '+251' }]);
    expect(sectionList([{ type: 'faq' }])).toEqual([{ type: 'faq' }]);
  });
});
