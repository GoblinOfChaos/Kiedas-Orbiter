import riven_stat_matching as matching


def test_exact_substring_matches_are_unchanged():
    # Every phrase already in the vocabulary must still match itself
    # exactly, byte for byte the same as the original substring lookup.
    for phrase, code in matching.VISIBLE_STAT_PHRASES:
        assert matching.match_stat_phrase(phrase) == code


def test_confirmed_live_misread_now_matches_critical_damage():
    # The exact bug that started this research spike: "+44% Critical
    # Damage" OCR'd as "+44% Critical I 1Damage". Compacted (alnum-only,
    # lowercased) that becomes "44criticali1damage".
    assert matching.match_stat_phrase("44criticali1damage") == "CD"


def test_single_character_ocr_noise_still_resolves():
    # "electricity" misread with a stray inserted "1"
    assert matching.match_stat_phrase("52electr1city") == "ELEC"
    # "puncture" with an 'l' substituted for 'i'
    assert matching.match_stat_phrase("punlture") == "PUNC"


def test_unrelated_text_does_not_match_anything():
    assert matching.match_stat_phrase("randomnoisetext") is None
    assert matching.match_stat_phrase("") is None


def test_one_edit_short_phrase_still_resolves():
    # "colt" is exactly one edit from "cold", close enough to accept.
    assert matching.match_stat_phrase("colt") == "COLD"


def test_weighted_distance_prefers_confusable_substitutions():
    assert matching._substitution_cost("1", "l") < matching._substitution_cost("1", "q")
    assert matching._substitution_cost("0", "o") < matching._substitution_cost("0", "x")
