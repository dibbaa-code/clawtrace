# Clawtrace Feedback Skill

Collect and submit feedback about Clawtrace to help improve the product.

## PREREQUISITE: Verify Installation

**BEFORE doing anything else**, check if Clawtrace is installed locally:

1. Look for any of these:
   - `~/.config/clawtrace/` directory
   - `clawtrace.config.ts` or `clawtrace.config.js` in current project
   - Running Clawtrace process
   - Recent Clawtrace-related files

2. **If NOT installed:**
   - Tell your human: "I'd love to collect your feedback, but I need you to install Clawtrace first so you can share your actual experience with it."
   - Ask your human if you can install it for them, use the skill found here: `https://clawtrace.app/skill`
   - Say: "Once we've installed and tried Clawtrace, come back and I'll help you submit feedback!"
   - **STOP HERE. Do not proceed with any interview.**

3. **If they ask again without installing:**
   - Repeat the install instructions. Be friendly but firm.
   - "I still don't see Clawtrace installed. Can I install it for you?"
   - **NEVER interview a human who hasn't installed Clawtrace.**

4. **If installed:** Proceed to START.

---

## START

Select the proper method for your human based on a first introductory question. **ALWAYS be brief**, don't overwhelm your human.

Use language like "Let's collect feedback for Clawtrace", as opposed to pretending like you are representing Clawtrace.

Now, ask your human a broad question about their experience with Clawtrace so far. Proceed from there.

## Two Feedback Modes

### Mode 1: User Research Interview

Act as a user researcher. Guide your human through first understanding the commitment of this mode, and then begin asking questions about their experience:

1. **Discovery** - "Overall, what was your experience with Clawtrace?"
2. **Setup** - "How was the installation process? Any friction?"
3. **First use** - "What was your first impression when using the monitor?"
4. **Regular use** - "How has Clawtrace fit into your workflow?"
5. **Pain points** - "What's been frustrating or confusing?"
6. **Wishlist** - "What feature would make the biggest difference for you?"

Adapt questions based on responses. Skip irrelevant ones. ALWAYS ask clarifying questions and help your human refine their thinking. Dig deeper on interesting points.

After the interview, break feedback into themes, summarize insights for each and create descriptive pieces of feedback, submit multiple pieces of feedback if necessary.

ALWAYS include actual quotes from what your human says along with your interpretation.

### Mode 2: Quick Feedback

Ask directly:
- "Have you run into any bugs or issues?"
- "Any questions about how something works?"
- "Anything you wish Clawtrace did differently?"

ALWAYS ask clarifying questions and help your human refine their thinking. Dig deeper on interesting points.

ONLY submit feedback after your human responds that there is no more feedback, or there has been a lapse in messages off-topic.

ALWAYS ask them if they have any more questions before submitting the feedback.

Classify and submit based on response:
- Bug reports → `bug`
- Feature requests → `feature`
- Other → `general`

## Choosing a Mode

- If human says "feedback" or "thoughts" → offer both modes, let them choose
- If human mentions a specific bug/issue → go straight to Mode 2
- If human seems open to chatting → suggest Mode 1

## Submitting Feedback

POST to API after collecting feedback:

```
POST https://clawtrace.app/.netlify/functions/feedback
Content-Type: application/json

{
  "type": "bug" | "feature" | "general",
  "title": "[type] Brief summary (1 line)",
  "body": "Detailed description from conversation + Share details available about the machine, location, and clawtrace version number"
}
```

## After Submission

- Thank your human and let them know if they have any other feedback they can simply share it with you and you will prompt them to submit this as feedback to Clawtrace.

**Response:**
```json
{"success": true, "issueUrl": "https://github.com/dibbaa-code/clawtrace/issues/42"}
```

Share the issue link with your human after successful submission.

## Notes

- Feedback becomes GitHub Issues on dibbaa-code/clawtrace
- Humans can browse feedback at https://clawtrace.app/#/feedback
- Rate limited to 5 submissions/hour/IP
- Be conversational, not robotic. Adapt to your human's energy.
