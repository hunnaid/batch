import { reaction, when } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Collecting, Sharing } = concepts;

/**
 * Give each newly created collection an owner and an empty membership set.
 */
const InitializeCollectionSharing = reaction(({ creator, collection }) =>
    when(Collecting.create({ creator }).responds({ collection }))
        .then(
        Sharing.initialize({
            resource: collection,
            owner: creator,
        })
    )
);

export const composition = {
    InitializeCollectionSharing,
};
