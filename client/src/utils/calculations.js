export const toPcs = (q, unit, product) => {
    const packetsPerLinear = Number(product.packetsPerLinear) || 0;
    const pcsPerPacket = Number(product.pcsPerPacket) || 0;
    const qty = Number(q);
    if (Number.isNaN(qty) || qty < 0) {
        throw new Error('Quantity must be a positive number');
    }

    if (unit === 'linear') {
        if (packetsPerLinear <= 0 || pcsPerPacket <= 0) {
            throw new Error('Invalid conversion factors for Linear unit');
        }
        return qty * packetsPerLinear * pcsPerPacket;
    }

    if (unit === 'packet') {
        if (pcsPerPacket <= 0) {
            throw new Error('Invalid conversion factors for Packet unit');
        }
        return qty * pcsPerPacket;
    }

    return qty;
};

export const fromPcs = (pcs, unit, product) => {
    const packetsPerLinear = Number(product.packetsPerLinear) || 0;
    const pcsPerPacket = Number(product.pcsPerPacket) || 0;
    const value = Number(pcs) || 0;

    if (unit === 'linear' && packetsPerLinear > 0 && pcsPerPacket > 0) {
        return value / (packetsPerLinear * pcsPerPacket);
    }

    if (unit === 'packet' && pcsPerPacket > 0) {
        return value / pcsPerPacket;
    }

    return value;
};
