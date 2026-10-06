# Problem Framing

## Domain
Home cooks find recipes through websites, social media, cookbooks, and many other places. They bookmark links, take screenshots, or write it down in a notebook to return to later when they're planning meals, buying ingredients, and actually cooking.

Cooks also adapt recipes to the ingredients they have, the equipment they use, and their preferences. They change the quantities, make substitutions, and adjust cook times. These experiences teach them what works and what doesn't.

The users I want to focus on here are home cooks who regularly adapt recipes and exchange them with friends or family. They want to find meals they enjoyed, and be able to reproduce them and give other people enough information to be able to copy what they recommend. Finding the original recipe won't necessarily bring back the information on how they actually cooked it.

## Bad situations
One bad situation occurs when a good substitution is forgotten. For example, a cook makes cookies with brown butter and less sugar, and a longer bake time. They enjoyed the end result and bookmark the recipe, expecting to remember the changes. A month later, when they are trying to recall the adjustments, they are struggling to remember and have to make a guess. They might be wasting time and ingredients on a worse result.

A second bad situation occurs when changes have been recorded. For example, a cook might keep the original bookmark in their browser, substitution suggestions in a screenshot, and a note about the cook time in a message to their friend. Before cooking again, they would have to search all across their platforms to find and match all the information that's relevant to make the meal again. Overlooking one note would also mean repeating a potential mistake from the past they wrote about avoiding.

Recipe sharing is another bad situation, going off of the previous one. A friend enjoys the modified version of the cookie from the original, so they ask for the modified recipe. The cook sends them the original recipe link, but leaves out the adjustments. The friend then follows those instructions and gets a different result. Later explanations arrive in messages, leaving the friend to uncover the modified recipe. As both people keep changing the recipe, they will have a harder time identifying which modifications produced each cook's preferred result.

The recurring difficulty is preserving the connection between a recipe, the changes made to it, and the result. A saved link can remain easy to find while the information needed to reproduce or share a successful variation is lost.

## Corroboration
I have encountered this problem myself. My mom sent me a biryani recipe over iMessage, where it is scattered across the text chain in Urdu/English, which I have saved also as screenshots. Other details were in notes or were told to me verbally. this is one firsthand example of recipe information being scattered across formats, rather than evidence of this being a common problem.

In a post in r/Cooking on reddit, a cook describes having a hard time keeping track of recipes spread across many places such as notes app, web bookmarks, on paper, social media, etc. This provides a firsthand account of the retrieval and sharing problems.

Another cook describes making mental notes about improvements and forgetting them before preparing the dish again. In a separate discussion comparing Paprika, ReciMe, and Umami, the same author says they frequently adjust dishes they make repeatedly and want to revisit the changes and results. These posts add detail about the recurring difficulty for one person; they are not independent accounts.

A Paprika user describes wanting a family collection where new recipes appear automatically across separate accounts. After reviewing available options, they are frustrated with how limited the sharing is. This supports investigating the effort involved in maintaining an ongoing shared collection.

There is also counterevidence: replies to the cooking-notes discussion report success with handwritten notes and existing apps, and some cooks prefer improvising without detailed records. These self-selected, unverified accounts establish examples of the problem, but not its prevalence or demand for my proposed solution. I would investigate further by asking cooks who already exchange recipes to show how they retrieve a previous adjustment and share it. Their actual process would help establish whether the inconvenience warrants another tool.

While these online accounts show examples of the problem, they do not establish its prevalence or demand for Batch. I would ask cooks who already exchange recipes to show how they retrieve a previous adjustment and pass it to someone else. Observing the missing details, search effort, and existing workarounds would help establish whether another tool offers enough benefit.

## Workarounds and comparables
| Approach | What it helps with | Remaining difficulty |
| --- | --- | --- |
| Bookmarks, screenshots, messages | Quickly saving a recipe or sending it to someone. | When changes and adjustments are recorded separately, people have to find and reconnect the recipe themselves. |
| Notebooks and shared documents | Flexible ways to keep recipes and notes together; shared documents also support contributions from others. | They can work well, but users must maintain a consistent way to distinguish each person's changes and all the outcomes. |
| Paprika | Imports and organizes recipes and supports editing and notes. Recent beta adds family sharing across different accounts. | Shared access alone is not a sufficient distinction for Batch. I would compare the effort needed to record and retrieve a user's cooking attempt and result. |
| Umami | Supports importing, organizing, and collaborating on recipes. | A user reported difficulty tracking substitutions across different sessions. This may suggest a potential improvement rather than dismissing the app's capabilities completely. Comparison to test is how clearly users can distinguish several people's attempts and recover a particular result. |

Existing tools address much of the storage problem. My proposed refinement with Batch is to keep the original recipe and subsequent entries with adjustments together, making each adjustment easy to connect to the original and the result. The benefit to test is whether a group can recover and share a successful variation with less searching and explanation than current methods.

## Stakeholders
* Home cooks adapting recipes: Want to keep track of recipes, adjustments, and results so they can reproduce dishes they enjoyed.
* Friends and family receiving recipes: Want to understand the specific changes behind a recommended dish so they can recreate it and share their own results.
* Original recipe creators: Provide the recipe that can be adapted as a baseline for modifications as people try it.

## Solution Sketch
Batch would let cooks enter recipes in a consistent format and organize them into shared collections. Each recipe would retain its original instructions alongside dated cooking entries recording a person's adjustments and results. Friends and family could share a collection through separate accounts and use its entries to understand how a recommended dish was actually made.

The first version focuses on manual entry, collections, cooking entries, and collection sharing. Entries describe changes relative to the original recipe. A cook can record an adjustment while cooking and add the result afterward, without retyping the recipe.

The main uncertainty is whether cooks will record enough detail for the entries to be useful. Initial recipe entry also takes effort, especially when the source is a set of screenshots. I would compare Batch with users' current methods by asking them to find and explain a previously recorded variation. I would look for less searching, fewer missing details, and less need for clarification, while checking whether recording the information adds more work than users are willing to do.

## Sources
[post 1](https://www.reddit.com/r/Cooking/comments/16ly49y/where_do_you_all_save_your_recipes_my_methods_are/),
[post 2](https://www.reddit.com/r/Cooking/comments/1s9b0x0/do_you_ever_write_down_what_youd_do_differently/),
[post 3](https://www.reddit.com/r/PaprikaApp/comments/1g934l5/best_way_to_share_paprika_recipes_with_family/),
[post 4](https://www.reddit.com/r/Cooking/comments/1swj42b/paprika_vs_recime_vs_umami/)
