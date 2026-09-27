#!/usr/bin/env python3
"""Shared cost-formatting helper for Vendors/data offerings. The "3" field
(cost) is usually a plain number paired with the vendor's Currency, but for
some vendors (e.g. Master Teasonai's Conservation-tag purchases) it's a
dict of multiple resource-tag costs instead - e.g.
{"Nephil Vasca Kavat Tag": 3, "Ostia Vasca Kavat Tag": 3}. Every resolver
that builds a vendor-offering sentence needs to handle both shapes."""


def format_cost(cost, currency=None):
    if isinstance(cost, dict):
        return ", ".join(f"{amount}x {name}" for name, amount in cost.items())
    if isinstance(cost, (int, float)):
        cost_str = f"{cost:,}"
    else:
        cost_str = str(cost)
    return f"{cost_str} {currency}" if currency else cost_str
