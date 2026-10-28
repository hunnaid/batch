<script setup lang="ts">
import { computed, nextTick } from "vue";
import { createRecipeRow, createRecipeSection, type EditableRecipeSection } from "../recipe-sections";

const props = defineProps<{ kind: "ingredient" | "instruction"; disabled: boolean }>();
const sections = defineModel<EditableRecipeSection[]>({ required: true });
const title = computed(() => props.kind === "ingredient" ? "Ingredients" : "Instructions");
const rowLabel = computed(() => props.kind === "ingredient" ? "Ingredient" : "Step");

async function addRow(section: EditableRecipeSection, index: number) {
  if (props.disabled) return;
  const row = createRecipeRow();
  section.rows.splice(index + 1, 0, row);
  await nextTick();
  document.getElementById(row.id)?.focus();
}

async function removeRow(section: EditableRecipeSection, index: number) {
  if (props.disabled || section.rows.length === 1) return;
  section.rows.splice(index, 1);
  await nextTick();
  document.getElementById(section.rows[Math.min(index, section.rows.length - 1)]!.id)?.focus();
}

async function showHeading(section: EditableRecipeSection) {
  if (props.disabled) return;
  section.showHeading = true;
  await nextTick();
  document.getElementById(`heading-${section.id}`)?.focus();
}

async function addSection() {
  if (props.disabled) return;
  const section = createRecipeSection();
  section.showHeading = true;
  sections.value = [...sections.value, section];
  await nextTick();
  document.getElementById(`heading-${section.id}`)?.focus();
}

async function removeSection(index: number) {
  if (props.disabled || sections.value.length === 1) return;
  sections.value = sections.value.filter((_, sectionIndex) => sectionIndex !== index);
  await nextTick();
  const next = sections.value[Math.min(index, sections.value.length - 1)]!;
  document.getElementById(next.rows[0]!.id)?.focus();
}
</script>

<template>
  <section :aria-labelledby="`${kind}-sections-heading`">
    <h4 :id="`${kind}-sections-heading`">{{ title }}</h4>
    <div v-for="(section, sectionIndex) in sections" :key="section.id" class="recipe-section"
      :class="{ 'multiple-sections': sections.length > 1 }">
      <div v-if="sections.length > 1" class="section-toolbar">
        <strong>Section {{ sectionIndex + 1 }}</strong>
        <button type="button" class="remove-section" :disabled="disabled"
          :aria-label="`Remove ${kind} section ${sectionIndex + 1}`" @click="removeSection(sectionIndex)">
          Remove section
        </button>
      </div>
      <div v-if="section.showHeading || section.heading.trim() || sections.length > 1" class="section-heading-field">
        <label :for="`heading-${section.id}`">Section heading (optional)</label>
        <input :id="`heading-${section.id}`" v-model="section.heading" :disabled="disabled" dir="auto"
          :placeholder="kind === 'ingredient' ? 'For example, Cake or buttercream' : 'For example, Make the buttercream'" />
      </div>
      <button v-else type="button" class="heading-toggle" :disabled="disabled" @click="showHeading(section)">
        Add section heading (optional)
      </button>

      <div v-for="(row, index) in section.rows" :key="row.id" class="recipe-row">
        <label :for="row.id">{{ rowLabel }} {{ index + 1 }}</label>
        <input v-if="kind === 'ingredient'" :id="row.id" v-model="row.text" :disabled="disabled" dir="auto"
          placeholder="For example, 2 cups basmati rice" required />
        <textarea v-else :id="row.id" v-model="row.text" :disabled="disabled" rows="3" dir="auto" required />
        <div class="row-actions">
          <button type="button" class="button-primary" :disabled="disabled"
            :aria-label="`Add below ${rowLabel.toLowerCase()} ${index + 1} in section ${sectionIndex + 1}`"
            @click="addRow(section, index)">Add below</button>
          <button type="button" class="remove-row" :disabled="disabled || section.rows.length === 1"
            :aria-label="`Remove ${rowLabel.toLowerCase()} ${index + 1} from section ${sectionIndex + 1}`"
            :title="`Remove ${rowLabel.toLowerCase()} ${index + 1}`" @click="removeRow(section, index)">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    <button type="button" class="add-section" :disabled="disabled" @click="addSection">
      <span aria-hidden="true">+</span> Add {{ kind }} section
    </button>
  </section>
</template>

<style scoped>
.recipe-section { min-width: 0; }
.multiple-sections { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
.section-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.section-heading-field { display: grid; gap: 8px; margin-bottom: 20px; }
.section-heading-field label { margin: 0; }
.heading-toggle { margin-bottom: 12px; padding-inline: 0; background: transparent; border-color: transparent; font-weight: 400; }
.heading-toggle:hover:not(:disabled) { background: transparent; text-decoration: underline; }
.remove-section { color: var(--error); border-color: var(--error); }
.remove-section:hover:not(:disabled) { background: var(--error-soft); border-color: var(--error); }
.add-section { display: inline-flex; align-items: center; gap: 8px; margin-top: 4px; }
.add-section span { font-size: 1.25rem; line-height: 1; }
.recipe-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; margin-bottom: 1rem; }
.recipe-row label { grid-column: 1; margin: 0; }
.recipe-row input, .recipe-row textarea { grid-column: 1; grid-row: 2; }
.row-actions { display: flex; align-items: center; grid-column: 2; grid-row: 2; gap: 8px; }
.row-actions button { padding: 8px 12px; font-size: 0.9rem; }
.row-actions .remove-row { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; padding: 8px; color: var(--error); border-color: var(--error); }
.remove-row:hover:not(:disabled) { background: var(--error-soft); border-color: var(--error); }
.remove-row svg { width: 18px; height: 18px; }

@media (max-width: 480px) {
  .row-actions { flex-direction: column; align-items: stretch; }
}
</style>
