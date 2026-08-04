"""
Curated folk-wisdom and standard agronomic companion-planting pairs --
a second, independent knowledge source alongside RAG, not a replacement.
Reasoning column intentionally kept factual (nitrogen-fixing, shared
support structure, complementary root depth, shade tolerance, pest
deterrence) rather than vague, so the agent can cite a real mechanism.
"""

COMPANION_RULES = {
    # ---------------- VEGETABLES ----------------
    "bitter_gourd": [
        {"companion": "yardlong beans / cowpea", "reasoning": "Shared trellis, beans fix nitrogen the gourd needs, staggered harvest timing."},
    ],
    "ridge_gourd": [
        {"companion": "amaranthus", "reasoning": "Fast-growing leafy crop fills ground space while the vine establishes overhead."},
    ],
    "ash_gourd": [
        {"companion": "cowpea", "reasoning": "Nitrogen-fixing companion; both tolerate similar watering schedules."},
    ],
    "snake_gourd": [
        {"companion": "cowpea", "reasoning": "Same trellis-sharing and nitrogen-fixing logic as bitter gourd and ash gourd."},
    ],
    "okra": [
        {"companion": "beans", "reasoning": "Complementary root depth -- beans shallow, okra deep -- reduces competition."},
    ],
    "brinjal": [
        {"companion": "coriander", "reasoning": "Aromatic herb helps repel common brinjal pests when interplanted along borders."},
    ],
    "tomato": [
        {"companion": "marigold", "reasoning": "Marigold root exudates help deter soil nematodes and some insect pests."},
    ],
    "cucumber": [
        {"companion": "marigold", "reasoning": "Same pest-deterrent effect as with tomato; also attracts pollinators."},
    ],
    "cabbage": [
        {"companion": "coriander", "reasoning": "Aromatic companion planting reduces aphid pressure; suited to Kerala's high-range cabbage belts (Wayanad, Munnar)."},
    ],

    # ---------------- PLANTATION HOMESTEAD SYSTEMS ----------------
    "coconut": [
        {"companion": "pepper", "reasoning": "Palm trunk serves as a live standard for the pepper vine -- traditional multi-tier Kerala homestead system."},
        {"companion": "banana", "reasoning": "Fills mid-canopy space while young coconut palms are still establishing."},
        {"companion": "cocoa", "reasoning": "Shade-tolerant, matches the light levels under a mature coconut canopy."},
        {"companion": "turmeric", "reasoning": "Shade-tolerant tuber crop grown in the understory of coconut gardens."},
        {"companion": "ginger", "reasoning": "Same understory shade-tolerance logic as turmeric."},
        {"companion": "elephant foot yam", "reasoning": "Common understory intercrop in coconut gardens, tolerates partial shade."},
        {"companion": "pineapple", "reasoning": "Standard intercrop in young coconut gardens before canopy closes."},
    ],
    "arecanut": [
        {"companion": "pepper", "reasoning": "Same live-standard climbing support principle as coconut."},
        {"companion": "cocoa", "reasoning": "Shade-tolerant, matches arecanut's dappled-light understory."},
        {"companion": "banana", "reasoning": "Fills mid-canopy space in young arecanut gardens."},
    ],
    "rubber": [
        {"companion": "pineapple", "reasoning": "Standard intercrop during the 5-7 year immature phase before canopy closes and tapping begins."},
        {"companion": "banana", "reasoning": "Same immature-phase intercropping logic as pineapple."},
    ],
    "nutmeg": [
        {"companion": "pepper", "reasoning": "Nutmeg trees are sometimes used as a live standard for pepper vines in older homesteads."},
    ],
    "jackfruit": [
        {"companion": "pepper", "reasoning": "Jackfruit trees are also used as a live standard for pepper vines, similar to coconut and arecanut."},
    ],

    # ---------------- FIELD / ROTATION CROPS ----------------
    "tapioca": [
        {"companion": "cowpea", "reasoning": "Tapioca is a heavy feeder; a nitrogen-fixing legume intercrop offsets some of the soil demand."},
        {"companion": "groundnut", "reasoning": "Same nitrogen-fixing rationale as cowpea; also improves ground cover to reduce erosion."},
    ],
    "maize": [
        {"companion": "cowpea", "reasoning": "Classic cereal-legume intercrop -- cowpea fixes nitrogen maize needs, different root depths reduce competition."},
    ],
    "banana": [
        {"companion": "turmeric", "reasoning": "Shade-tolerant crop grown in the understory during banana's growth phase."},
        {"companion": "ginger", "reasoning": "Same understory shade-tolerance logic as turmeric."},
        {"companion": "cowpea", "reasoning": "Early-stage intercrop while the banana canopy is still developing."},
    ],

    # ---------------- WETLAND / TRADITIONAL SYSTEMS ----------------
    "rice": [
        {"companion": "fish (integrated rice-fish)", "reasoning": "Traditional Kuttanad practice -- fish control pests and add nutrients to paddy water."},
        {"companion": "azolla", "reasoning": "Nitrogen-fixing aquatic fern grown alongside rice in flooded fields, traditionally used as a natural biofertilizer."},
    ],
}


def lookup_companions(crop_name: str):
    key = crop_name.lower().strip().replace(" ", "_")
    return COMPANION_RULES.get(key, [])