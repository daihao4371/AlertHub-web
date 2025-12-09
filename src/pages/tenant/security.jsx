import React, { useEffect, useState } from 'react'
import {Switch} from "antd";
import {updateTenant} from "../../api/tenant";

export const TenantSecurity = ({tenantInfo})=>{
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        if (tenantInfo) {
            setEnabled(tenantInfo.removeProtection)
        }
    }, [tenantInfo])

    const handleSwitchChange = async (checked) => {
        setEnabled(checked);
        try {
            const params = {
                ...tenantInfo,
                removeProtection: checked,
            }

            await updateTenant(params)
        } catch (error) {
            console.error(error)
        }
    };

    return(
        <div>
            <div style={{ marginBottom: '16px' }}>
                <span style={{ marginRight: '8px' }}>删除保护:</span>
                <Switch checked={enabled} onChange={handleSwitchChange} />
            </div>
        </div>
    )
}