import { assemble } from "@mit-sdg/sync-engine/assembly";
import { applicationConceptSet } from "./concepts.ts";
import { RecipeRecordingConcept } from "./concepts/RecipeRecording.ts";
import { PasswordAuthenticatingConcept } from "./concepts/PasswordAuthenticating.ts";
import { CollectingConcept } from "./concepts/Collecting.ts";
import { CookingLogConcept } from "./concepts/CookingLog.ts";
import { SharingConcept } from "./concepts/Sharing.ts";
import { SessioningConcept } from "./concepts/Sessioning.ts";
import { SavingConcept } from "./concepts/Saving.ts";

import { composition as collectionsComposition } from "./compositions/Collections.ts";
import { composition as accountsComposition } from "./compositions/Accounts.ts";
import { composition as recipesComposition } from "./compositions/Recipes.ts";
import { db } from "./db.ts";

/**
 * Build the application from its registered concepts and compositions.
 */
export function assembleApplication() {
  return assemble({
    conceptSet: applicationConceptSet,

    // Supply the database required by RecipeRecording's constructor.
    instances: {
      RecipeRecording: new RecipeRecordingConcept(db),
      PasswordAuthenticating: new PasswordAuthenticatingConcept(db),
      Collecting: new CollectingConcept(db),
      CookingLog: new CookingLogConcept(db),
      Sharing: new SharingConcept(db),
      Sessioning: new SessioningConcept(db),
      Saving: new SavingConcept(db),
    },

    // Endpoints and reactions will be added here next.
    composition: {
      Collections: collectionsComposition,
      Accounts: accountsComposition,
      Recipes: recipesComposition,
    },
  });
}
